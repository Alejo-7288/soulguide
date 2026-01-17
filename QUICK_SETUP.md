# 快速設置指南

## 數據庫遷移錯誤解決

如果您遇到 `DATABASE_URL is required` 錯誤，請按照以下步驟操作：

### 方案 1：創建 .env 文件（推薦）

1. 複製示例配置文件：
```bash
cp .env.example .env
```

2. 編輯 `.env` 文件，設置數據庫連接字符串：
```env
DATABASE_URL="mysql://username:password@host:port/database"
```

例如：
```env
DATABASE_URL="mysql://root:password@localhost:3306/soulguide"
```

3. 運行遷移：
```bash
pnpm db:push
```

### 方案 2：臨時設置環境變數

如果您只是想快速測試，可以在命令前設置環境變數：

```bash
DATABASE_URL="mysql://username:password@host:port/database" pnpm db:push
```

### 方案 3：跳過遷移（開發環境）

如果您暫時沒有數據庫，可以先跳過遷移步驟。Google Calendar 功能的代碼已經就緒，當您準備好數據庫時再運行遷移即可。

## Google Calendar 配置

在 `.env` 文件中添加 Google OAuth 憑證：

```env
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_CALENDAR_SCOPE="https://www.googleapis.com/auth/calendar.readonly"
```

獲取憑證的詳細步驟請參考 [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md)。

## 啟動開發服務器

完成配置後，啟動應用：

```bash
pnpm dev
```

## 檢查安裝

驗證 Google APIs 包已正確安裝：

```bash
pnpm list googleapis google-auth-library
```

應該顯示：
```
google-auth-library 10.5.0
googleapis 170.0.0
```

## 常見問題

### Q: 我沒有 MySQL 數據庫怎麼辦？

**選項 1 - 使用 Docker：**
```bash
docker run --name soulguide-mysql -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=soulguide -p 3306:3306 -d mysql:8
```

然後設置：
```env
DATABASE_URL="mysql://root:password@localhost:3306/soulguide"
```

**選項 2 - 使用在線服務：**
- PlanetScale (免費)
- Railway (免費額度)
- Supabase (支持 PostgreSQL)

### Q: 遷移失敗怎麼辦？

1. 檢查數據庫連接是否正確
2. 確認數據庫用戶有創建表的權限
3. 查看詳細錯誤信息
4. 如果是合併衝突導致的 schema 問題，可能需要手動執行 SQL

### Q: Google Calendar 整合需要數據庫嗎？

是的，需要數據庫來存儲：
- OAuth 令牌 (`google_calendar_tokens` 表)
- 同步的忙碌時段 (`google_calendar_busy_slots` 表)

但您可以先完成 Google Cloud Console 的配置，稍後再運行遷移。

## 下一步

1. ✅ 安裝依賴（已完成）
2. ⏳ 設置 `.env` 文件
3. ⏳ 運行數據庫遷移
4. ⏳ 配置 Google Cloud Console
5. ⏳ 測試功能

需要幫助？查看完整文檔：
- [Google Calendar 設置指南](GOOGLE_CALENDAR_SETUP.md)
- [實現總結](GOOGLE_CALENDAR_IMPLEMENTATION.md)
