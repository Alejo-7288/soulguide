import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ENV } from './env';
import * as db from '../db';
import { TRPCError } from '@trpc/server';

/**
 * Google Calendar 整合服務
 * 處理 OAuth 認證、令牌管理和日曆同步
 */

// 初始化 OAuth2 客戶端
export function getOAuth2Client(redirectUri?: string): OAuth2Client {
  return new google.auth.OAuth2(
    ENV.googleClientId,
    ENV.googleClientSecret,
    redirectUri || `${ENV.oAuthServerUrl}/auth/google/callback`
  );
}

/**
 * 生成 Google OAuth 授權 URL
 */
export function generateAuthUrl(teacherProfileId: number): string {
  const oauth2Client = getOAuth2Client();
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // 獲取 refresh token
    scope: [ENV.googleCalendarScope],
    state: teacherProfileId.toString(), // 將 teacherProfileId 編碼到 state
    prompt: 'consent', // 確保每次都獲取 refresh token
  });

  return authUrl;
}

/**
 * 處理 OAuth 回調，交換 code 獲取 tokens
 */
export async function handleOAuthCallback(code: string, teacherProfileId: number) {
  const oauth2Client = getOAuth2Client();
  
  try {
    // 交換 code 獲取 tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: '無法獲取訪問令牌',
      });
    }

    oauth2Client.setCredentials(tokens);

    // 獲取主日曆 ID
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarList = await calendar.calendarList.list();
    const primaryCalendar = calendarList.data.items?.find(cal => cal.primary);
    
    if (!primaryCalendar?.id) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: '無法找到主日曆',
      });
    }

    // 計算過期時間
    const expiresAt = new Date(Date.now() + (tokens.expiry_date || 3600 * 1000));

    // 保存或更新令牌
    const existingToken = await db.getGoogleCalendarToken(teacherProfileId);
    
    if (existingToken) {
      await db.updateGoogleCalendarToken(teacherProfileId, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        calendarId: primaryCalendar.id,
        isActive: true,
      });
    } else {
      await db.createGoogleCalendarToken({
        teacherProfileId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        calendarId: primaryCalendar.id,
        isActive: true,
      });
    }

    // 立即同步一次忙碌時段
    await syncBusySlots(teacherProfileId);

    return {
      success: true,
      calendarId: primaryCalendar.id,
    };
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: '連接 Google Calendar 失敗',
    });
  }
}

/**
 * 刷新過期的訪問令牌
 */
export async function refreshAccessToken(teacherProfileId: number): Promise<string> {
  const tokenData = await db.getGoogleCalendarToken(teacherProfileId);
  
  if (!tokenData) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: '未找到 Google Calendar 連接',
    });
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: tokenData.refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error('無法刷新訪問令牌');
    }

    // 更新數據庫
    const expiresAt = new Date(Date.now() + (credentials.expiry_date || 3600 * 1000));
    await db.updateGoogleCalendarToken(teacherProfileId, {
      accessToken: credentials.access_token,
      expiresAt,
    });

    return credentials.access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    // 如果刷新失敗，標記為不活躍
    await db.updateGoogleCalendarToken(teacherProfileId, {
      isActive: false,
    });
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Google Calendar 連接已過期，請重新授權',
    });
  }
}

/**
 * 獲取有效的 OAuth2 客戶端（自動處理令牌刷新）
 */
async function getAuthenticatedClient(teacherProfileId: number): Promise<OAuth2Client> {
  const tokenData = await db.getGoogleCalendarToken(teacherProfileId);
  
  if (!tokenData || !tokenData.isActive) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: '未連接 Google Calendar',
    });
  }

  const oauth2Client = getOAuth2Client();
  
  // 檢查令牌是否即將過期（提前 5 分鐘刷新）
  const now = new Date();
  const expiresAt = new Date(tokenData.expiresAt);
  const shouldRefresh = expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

  if (shouldRefresh) {
    const newAccessToken = await refreshAccessToken(teacherProfileId);
    oauth2Client.setCredentials({
      access_token: newAccessToken,
      refresh_token: tokenData.refreshToken,
    });
  } else {
    oauth2Client.setCredentials({
      access_token: tokenData.accessToken,
      refresh_token: tokenData.refreshToken,
    });
  }

  return oauth2Client;
}

/**
 * 同步師傅的 Google Calendar 忙碌時段
 */
export async function syncBusySlots(teacherProfileId: number): Promise<number> {
  const oauth2Client = await getAuthenticatedClient(teacherProfileId);
  const tokenData = await db.getGoogleCalendarToken(teacherProfileId);
  
  if (!tokenData) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: '未找到 Google Calendar 連接',
    });
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    // 獲取未來 90 天的事件
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);

    const events = await calendar.events.list({
      calendarId: tokenData.calendarId,
      timeMin: now.toISOString(),
      timeMax: futureDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    // 過濾忙碌事件（非全天事件，且非透明）
    const busyEvents = events.data.items?.filter(event => {
      // 跳過全天事件
      if (event.start?.date) return false;
      
      // 只要不是 'transparent'，就算忙碌
      if (event.transparency === 'transparent') return false;
      
      return event.start?.dateTime && event.end?.dateTime;
    }) || [];

    // 清空舊的忙碌時段
    await db.deleteGoogleCalendarBusySlots(teacherProfileId);

    // 插入新的忙碌時段
    const busySlots = busyEvents.map(event => ({
      teacherProfileId,
      eventId: event.id || '',
      eventTitle: event.summary || null,
      startTime: new Date(event.start!.dateTime!),
      endTime: new Date(event.end!.dateTime!),
    }));

    if (busySlots.length > 0) {
      await db.createGoogleCalendarBusySlots(busySlots);
    }

    return busySlots.length;
  } catch (error) {
    console.error('Sync busy slots error:', error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: '同步日曆失敗',
    });
  }
}

/**
 * 斷開 Google Calendar 連接
 */
export async function disconnectCalendar(teacherProfileId: number) {
  // 刪除令牌和忙碌時段
  await db.deleteGoogleCalendarToken(teacherProfileId);
  await db.deleteGoogleCalendarBusySlots(teacherProfileId);
  
  return { success: true };
}

/**
 * 獲取師傅的忙碌時段
 */
export async function getBusySlots(
  teacherProfileId: number,
  startDate: Date,
  endDate: Date
) {
  const busySlots = await db.getGoogleCalendarBusySlots(
    teacherProfileId,
    startDate,
    endDate
  );

  return busySlots.map(slot => ({
    startTime: slot.startTime,
    endTime: slot.endTime,
    eventTitle: slot.eventTitle,
  }));
}

/**
 * 檢查時段是否與忙碌時段衝突
 */
export async function checkTimeSlotConflict(
  teacherProfileId: number,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  const busySlots = await db.getGoogleCalendarBusySlots(
    teacherProfileId,
    startTime,
    endTime
  );

  // 檢查是否有任何重疊
  return busySlots.some(slot => {
    const slotStart = new Date(slot.startTime).getTime();
    const slotEnd = new Date(slot.endTime).getTime();
    const requestStart = startTime.getTime();
    const requestEnd = endTime.getTime();

    // 檢查時間段是否重疊
    return requestStart < slotEnd && requestEnd > slotStart;
  });
}
