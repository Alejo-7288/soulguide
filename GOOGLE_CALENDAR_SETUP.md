# Google Calendar 整合配置指南

## 環境變數設置

在 `.env` 文件中添加以下環境變數：

```env
# Google OAuth 配置
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALENDAR_SCOPE=https://www.googleapis.com/auth/calendar.readonly
```

## Google Cloud Console 設置步驟

### 1. 創建 Google Cloud 項目

1. 訪問 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新項目或選擇現有項目
3. 記下項目 ID

### 2. 啟用 Google Calendar API

1. 在左側菜單中選擇「API 和服務」> 「庫」
2. 搜索「Google Calendar API」
3. 點擊「啟用」

### 3. 創建 OAuth 2.0 憑證

1. 在左側菜單中選擇「API 和服務」> 「憑證」
2. 點擊「+ 創建憑證」> 「OAuth 客戶端 ID」
3. 如果提示配置 OAuth 同意畫面：
   - 選擇「外部」用戶類型
   - 填寫必要信息（應用名稱、支持郵箱等）
   - 添加測試用戶（如需測試）
4. 創建 OAuth 客戶端 ID：
   - 應用類型：「網頁應用程式」
   - 名稱：隨意填寫（例如：SoulGuide Calendar Integration）
   - 已授權的重定向 URI：
     - 開發環境：`http://localhost:5000/auth/google/callback`
     - 生產環境：`https://yourdomain.com/auth/google/callback`
5. 點擊「創建」
6. 複製「客戶端 ID」和「客戶端密鑰」

### 4. 配置環境變數

將獲取的憑證添加到 `.env` 文件：

```env
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnop
```

## 數據庫遷移

運行數據庫遷移以創建必要的表：

```bash
pnpm db:push
```

這將創建以下表：
- `google_calendar_tokens` - 存儲 OAuth 令牌
- `google_calendar_busy_slots` - 存儲同步的忙碌時段

## 使用方法

### 師傅端

1. 登錄師傅帳號
2. 進入「設置」頁面
3. 點擊「日曆整合」標籤
4. 點擊「連接 Google Calendar」按鈕
5. 在彈出的 Google 授權頁面中授權應用訪問日曆
6. 授權成功後，系統會自動同步忙碌時段

### 自動同步

系統會：
- 每天凌晨 2 點自動同步所有已連接的 Google Calendar
- 在令牌過期前 1 小時自動刷新
- 師傅也可以在設置頁面手動點擊「立即同步」按鈕

### 預約整合

當用戶預約時：
- 系統會自動檢查師傅的 Google Calendar 忙碌時段
- 已佔用的時段會顯示為不可選
- 如果嘗試預約忙碌時段，會顯示錯誤提示

## 測試

運行測試：

```bash
pnpm test google-calendar.test.ts
```

## 隱私與安全

- 系統只讀取日曆的忙碌時間（start/end），不讀取事件詳情
- 使用的 OAuth scope 為 `calendar.readonly`（只讀權限）
- 所有令牌都加密存儲在數據庫中
- 師傅可以隨時斷開連接，所有數據會被刪除

## 故障排除

### 授權失敗

- 確認重定向 URI 配置正確
- 檢查 OAuth 客戶端 ID 和密鑰是否正確
- 確認 Google Calendar API 已啟用

### 同步失敗

- 檢查令牌是否過期（系統會自動刷新）
- 確認師傅的 Google 帳號仍有效
- 查看服務器日誌以獲取詳細錯誤信息

### 時段衝突檢測不準確

- 確認時區設置正確
- 檢查數據庫中的忙碌時段數據
- 手動觸發同步以更新數據
