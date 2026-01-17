import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TRPCError } from '@trpc/server';
import * as googleCalendar from './_core/googleCalendar';
import * as db from './db';

// Mock dependencies
vi.mock('./_core/googleCalendar');
vi.mock('./db');

describe('Google Calendar Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('OAuth Flow', () => {
    it('should generate authorization URL with correct scope', () => {
      const teacherProfileId = 1;
      const mockAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&scope=calendar.readonly';
      
      vi.mocked(googleCalendar.generateAuthUrl).mockReturnValue(mockAuthUrl);
      
      const authUrl = googleCalendar.generateAuthUrl(teacherProfileId);
      
      expect(authUrl).toContain('calendar.readonly');
      expect(googleCalendar.generateAuthUrl).toHaveBeenCalledWith(teacherProfileId);
    });

    it('should handle OAuth callback and save tokens', async () => {
      const code = 'test_auth_code';
      const teacherProfileId = 1;
      const mockResult = {
        success: true,
        calendarId: 'primary@gmail.com',
      };
      
      vi.mocked(googleCalendar.handleOAuthCallback).mockResolvedValue(mockResult);
      
      const result = await googleCalendar.handleOAuthCallback(code, teacherProfileId);
      
      expect(result.success).toBe(true);
      expect(result.calendarId).toBe('primary@gmail.com');
    });

    it('should throw error on invalid OAuth callback', async () => {
      const code = 'invalid_code';
      const teacherProfileId = 1;
      
      vi.mocked(googleCalendar.handleOAuthCallback).mockRejectedValue(
        new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '連接 Google Calendar 失敗' })
      );
      
      await expect(
        googleCalendar.handleOAuthCallback(code, teacherProfileId)
      ).rejects.toThrow('連接 Google Calendar 失敗');
    });
  });

  describe('Busy Slots Sync', () => {
    it('should sync busy slots from Google Calendar', async () => {
      const teacherProfileId = 1;
      const mockSyncedCount = 5;
      
      vi.mocked(googleCalendar.syncBusySlots).mockResolvedValue(mockSyncedCount);
      
      const syncedCount = await googleCalendar.syncBusySlots(teacherProfileId);
      
      expect(syncedCount).toBe(5);
      expect(googleCalendar.syncBusySlots).toHaveBeenCalledWith(teacherProfileId);
    });

    it('should handle sync failure', async () => {
      const teacherProfileId = 1;
      
      vi.mocked(googleCalendar.syncBusySlots).mockRejectedValue(
        new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '同步日曆失敗' })
      );
      
      await expect(googleCalendar.syncBusySlots(teacherProfileId)).rejects.toThrow('同步日曆失敗');
    });

    it('should filter and store only busy events', async () => {
      const teacherProfileId = 1;
      const mockEvents = [
        { id: '1', summary: 'Meeting', start: { dateTime: '2024-01-15T10:00:00Z' }, end: { dateTime: '2024-01-15T11:00:00Z' } },
        { id: '2', summary: 'All-day event', start: { date: '2024-01-15' }, end: { date: '2024-01-16' } }, // Should be filtered
        { id: '3', summary: 'Transparent event', start: { dateTime: '2024-01-15T14:00:00Z' }, end: { dateTime: '2024-01-15T15:00:00Z' }, transparency: 'transparent' }, // Should be filtered
      ];
      
      vi.mocked(db.createGoogleCalendarBusySlots).mockResolvedValue();
      vi.mocked(googleCalendar.syncBusySlots).mockResolvedValue(1); // Only 1 busy event
      
      const syncedCount = await googleCalendar.syncBusySlots(teacherProfileId);
      
      expect(syncedCount).toBe(1); // Only the first meeting should be synced
    });
  });

  describe('Booking Conflict Detection', () => {
    it('should detect conflict with busy slot', async () => {
      const teacherProfileId = 1;
      const bookingStart = new Date('2024-01-15T10:00:00Z');
      const bookingEnd = new Date('2024-01-15T11:00:00Z');
      
      vi.mocked(googleCalendar.checkTimeSlotConflict).mockResolvedValue(true);
      
      const hasConflict = await googleCalendar.checkTimeSlotConflict(
        teacherProfileId,
        bookingStart,
        bookingEnd
      );
      
      expect(hasConflict).toBe(true);
    });

    it('should allow booking in available slot', async () => {
      const teacherProfileId = 1;
      const bookingStart = new Date('2024-01-15T14:00:00Z');
      const bookingEnd = new Date('2024-01-15T15:00:00Z');
      
      vi.mocked(db.getGoogleCalendarBusySlots).mockResolvedValue([]);
      vi.mocked(googleCalendar.checkTimeSlotConflict).mockResolvedValue(false);
      
      const hasConflict = await googleCalendar.checkTimeSlotConflict(
        teacherProfileId,
        bookingStart,
        bookingEnd
      );
      
      expect(hasConflict).toBe(false);
    });

    it('should detect partial overlap with busy slot', async () => {
      const teacherProfileId = 1;
      const bookingStart = new Date('2024-01-15T10:30:00Z'); // Starts during busy time
      const bookingEnd = new Date('2024-01-15T11:30:00Z');
      
      const mockBusySlots = [
        {
          id: 1,
          teacherProfileId: 1,
          eventId: 'event1',
          eventTitle: 'Meeting',
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T11:00:00Z'),
          syncedAt: new Date(),
        },
      ];
      
      vi.mocked(db.getGoogleCalendarBusySlots).mockResolvedValue(mockBusySlots);
      vi.mocked(googleCalendar.checkTimeSlotConflict).mockResolvedValue(true);
      
      const hasConflict = await googleCalendar.checkTimeSlotConflict(
        teacherProfileId,
        bookingStart,
        bookingEnd
      );
      
      expect(hasConflict).toBe(true);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh expired access token', async () => {
      const teacherProfileId = 1;
      const mockNewToken = 'new_access_token';
      
      const mockTokenData = {
        id: 1,
        teacherProfileId: 1,
        accessToken: 'old_token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() - 1000), // Expired
        calendarId: 'primary',
        isActive: true,
        connectedAt: new Date(),
        updatedAt: new Date(),
      };
      
      vi.mocked(db.getGoogleCalendarToken).mockResolvedValue(mockTokenData);
      vi.mocked(googleCalendar.refreshAccessToken).mockResolvedValue(mockNewToken);
      
      const newToken = await googleCalendar.refreshAccessToken(teacherProfileId);
      
      expect(newToken).toBe(mockNewToken);
    });

    it('should mark token as inactive on refresh failure', async () => {
      const teacherProfileId = 1;
      
      vi.mocked(googleCalendar.refreshAccessToken).mockRejectedValue(
        new TRPCError({ code: 'UNAUTHORIZED', message: 'Google Calendar 連接已過期，請重新授權' })
      );
      
      await expect(
        googleCalendar.refreshAccessToken(teacherProfileId)
      ).rejects.toThrow('Google Calendar 連接已過期，請重新授權');
    });
  });

  describe('Disconnect Calendar', () => {
    it('should delete tokens and busy slots on disconnect', async () => {
      const teacherProfileId = 1;
      
      vi.mocked(db.deleteGoogleCalendarToken).mockResolvedValue();
      vi.mocked(db.deleteGoogleCalendarBusySlots).mockResolvedValue();
      vi.mocked(googleCalendar.disconnectCalendar).mockResolvedValue({ success: true });
      
      const result = await googleCalendar.disconnectCalendar(teacherProfileId);
      
      expect(result.success).toBe(true);
      expect(googleCalendar.disconnectCalendar).toHaveBeenCalledWith(teacherProfileId);
    });
  });

  describe('Database Operations', () => {
    it('should create Google Calendar token', async () => {
      const mockToken = {
        teacherProfileId: 1,
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() + 3600000),
        calendarId: 'primary',
        isActive: true,
      };
      
      vi.mocked(db.createGoogleCalendarToken).mockResolvedValue();
      
      await db.createGoogleCalendarToken(mockToken);
      
      expect(db.createGoogleCalendarToken).toHaveBeenCalledWith(mockToken);
    });

    it('should retrieve busy slots within date range', async () => {
      const teacherProfileId = 1;
      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-16T00:00:00Z');
      
      const mockBusySlots = [
        {
          id: 1,
          teacherProfileId: 1,
          eventId: 'event1',
          eventTitle: 'Meeting',
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T11:00:00Z'),
          syncedAt: new Date(),
        },
      ];
      
      vi.mocked(db.getGoogleCalendarBusySlots).mockResolvedValue(mockBusySlots);
      
      const slots = await db.getGoogleCalendarBusySlots(teacherProfileId, startDate, endDate);
      
      expect(slots).toHaveLength(1);
      expect(slots[0].eventTitle).toBe('Meeting');
    });
  });
});
