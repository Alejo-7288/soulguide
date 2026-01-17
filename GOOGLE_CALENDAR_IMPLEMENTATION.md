# Google Calendar 整合實現總結

## ✅ 已完成的工作

### 1. 環境設置
- ✅ 在 `server/_core/env.ts` 添加了 Google OAuth 環境變數配置
- ✅ 添加了必要的 npm 依賴：`googleapis` 和 `google-auth-library`

### 2. 數據庫設計
- ✅ Schema 已定義（`drizzle/schema.ts`）：
  - `googleCalendarTokens` 表 - 存儲 OAuth 令牌
  - `googleCalendarBusySlots` 表 - 存儲同步的忙碌時段
- ✅ 遷移文件已存在：`drizzle/0006_google_calendar_integration.sql`
- ✅ 在 `server/db.ts` 添加了數據庫操作函數

### 3. 後端 API
- ✅ 創建了 `server/_core/googleCalendar.ts` 服務文件，實現：
  - OAuth 授權 URL 生成
  - OAuth 回調處理
  - 令牌刷新機制
  - 忙碌時段同步
  - 時段衝突檢測
  - 斷開連接功能

- ✅ 在 `server/routers.ts` 添加了 tRPC 路由：
  - `teachers.getGoogleCalendarAuthUrl` - 獲取授權 URL
  - `teachers.connectGoogleCalendar` - 處理 OAuth 回調
  - `teachers.disconnectGoogleCalendar` - 斷開連接
  - `teachers.syncGoogleCalendarBusySlots` - 手動同步
  - `teachers.getGoogleCalendarStatus` - 獲取連接狀態
  - `teachers.getCalendarBusySlots` - 獲取忙碌時段

- ✅ 預約創建時自動檢查 Google Calendar 衝突

### 4. 前端 UI
- ✅ 創建了 `GoogleCalendarConnect.tsx` 組件
  - 顯示連接狀態
  - 連接/斷開按鈕
  - 手動同步功能
  - 說明文案和隱私政策

- ✅ 創建了 `GoogleCalendarCallback.tsx` 頁面處理 OAuth 回調
- ✅ 在 `App.tsx` 添加了路由
- ✅ 在 `TeacherSettings.tsx` 添加了「日曆整合」標籤頁
- ✅ 修改了 `Booking.tsx` 以顯示和檢查忙碌時段

### 5. 測試
- ✅ 創建了 `server/google-calendar.test.ts` 測試文件，涵蓋：
  - OAuth 流程測試
  - 忙碌時段同步測試
  - 預約衝突檢測測試
  - 令牌刷新測試
  - 數據庫操作測試

### 6. 文檔
- ✅ 創建了 `GOOGLE_CALENDAR_SETUP.md` 配置指南

## 📋 使用步驟

### 配置 Google Cloud Console

1. 訪問 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建或選擇項目
3. 啟用 Google Calendar API
4. 創建 OAuth 2.0 憑證
5. 配置重定向 URI：
   - 開發：`http://localhost:5000/auth/google/callback`
   - 生產：`https://yourdomain.com/auth/google/callback`

### 配置環境變數

在 `.env` 文件中添加：

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALENDAR_SCOPE=https://www.googleapis.com/auth/calendar.readonly
```

### 運行數據庫遷移

```bash
# 確保已設置 DATABASE_URL 環境變數
export DATABASE_URL="mysql://user:password@host:port/database"

# 運行遷移
pnpm db:push
```

### 啟動應用

```bash
pnpm dev
```

## 🎯 功能說明

### 師傅端功能

1. **連接 Google Calendar**
   - 進入「設置」→「日曆整合」
   - 點擊「連接 Google Calendar」
   - 在 Google 授權頁面授權
   - 系統自動同步忙碌時段

2. **查看連接狀態**
   - 顯示連接狀態和日曆 ID
   - 顯示最後同步時間

3. **手動同步**
   - 點擊「立即同步」按鈕
   - 立即更新忙碌時段

4. **斷開連接**
   - 點擊「斷開連接」按鈕
   - 刪除所有同步數據

### 用戶端功能

1. **預約時自動檢查**
   - 選擇日期時，忙碌時段自動灰顯
   - 無法選擇已佔用的時間
   - 嘗試預約忙碌時段會顯示錯誤

2. **即時更新**
   - 師傅同步後，預約頁面立即反映最新狀態

## 🔒 隱私與安全

- 只讀取忙碌時間（start/end），不讀取事件詳情
- 使用 `calendar.readonly` 權限（只讀）
- 令牌加密存儲在數據庫
- 師傅可隨時斷開連接並刪除所有數據

## 🧪 測試

運行測試：

```bash
pnpm test google-calendar.test.ts
```

## 🚀 後續可添加的功能

1. **定時任務**
   - 每天自動同步所有師傅的日曆
   - 令牌過期前自動刷新
   - 建議使用 `node-cron` 或 `bull` 實現

2. **通知功能**
   - 同步失敗時通知師傅
   - 令牌過期提醒

3. **統計功能**
   - 同步歷史記錄
   - 忙碌時段統計

4. **多日曆支持**
   - 允許選擇特定日曆
   - 支持多個日曆同步

## 📝 注意事項

1. 確保 Google Cloud 項目配置正確
2. 重定向 URI 必須與環境匹配
3. 首次使用需要師傅授權
4. 建議定期檢查令牌狀態
5. 生產環境需要配置 HTTPS

## 🐛 常見問題

### 授權失敗
- 檢查 Client ID 和 Secret 是否正確
- 確認重定向 URI 配置正確
- 確認 Google Calendar API 已啟用

### 同步失敗
- 檢查令牌是否過期
- 查看服務器日誌
- 嘗試重新連接

### 時段衝突不準確
- 確認時區設置
- 手動觸發同步
- 檢查數據庫數據

## 📚 相關文件

- 配置指南：`GOOGLE_CALENDAR_SETUP.md`
- Schema：`drizzle/schema.ts`
- 遷移：`drizzle/0006_google_calendar_integration.sql`
- 服務：`server/_core/googleCalendar.ts`
- API：`server/routers.ts`
- 組件：`client/src/components/GoogleCalendarConnect.tsx`
- 回調：`client/src/pages/GoogleCalendarCallback.tsx`
- 測試：`server/google-calendar.test.ts`
