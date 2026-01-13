# GitHub Copilot 結構化提示詞文檔
## SoulGuide 功能擴展計劃

基於 SOUL MATE 架構，為 SoulGuide 添加 6 個核心功能。本文檔提供 GitHub Copilot 能直接理解和執行的提示詞。

---

## 📋 目錄
1. [師傅審核系統](#1-師傅審核系統)
2. [Google Calendar 整合](#2-google-calendar-整合)
3. [師傅儀表板增強](#3-師傅儀表板增強)
4. [課程管理系統](#4-課程管理系統)
5. [即時通知系統](#5-即時通知系統)
6. [支付系統優化](#6-支付系統優化)

---

## 1. 師傅審核系統

### 📌 功能描述
新師傅註冊後狀態為 `pending`（待審核），管理員在後台審核並批准/拒絕。批准後師傅狀態變為 `approved`，才會在前台展示。

### 🗄️ 數據庫設計

#### 1.1 更新 teacherProfiles 表
```sql
-- 添加以下欄位到 teacherProfiles 表
ALTER TABLE teacherProfiles ADD COLUMN (
  status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  approvedAt DATETIME NULL,
  approvedBy INT NULL,
  rejectionReason VARCHAR(500) NULL,
  FOREIGN KEY (approvedBy) REFERENCES users(id)
);
```

#### 1.2 創建審核歷史表
```sql
CREATE TABLE teacher_approval_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacherProfileId INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  reviewedBy INT NOT NULL,
  reviewNotes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacherProfileId) REFERENCES teacherProfiles(id),
  FOREIGN KEY (reviewedBy) REFERENCES users(id)
);
```

### 🔧 後端 API 實現

#### GitHub Copilot 提示詞 1.1：創建審核 API
```
在 server/routers.ts 中添加以下 tRPC 路由：

1. superadmin.getPendingTeachers - 獲取待審核師傅列表
   - 輸入：page (number), limit (number)
   - 返回：{ teachers: [], total: number, page: number, limit: number }
   - 查詢條件：status = 'pending'，按 submittedAt 降序排列

2. superadmin.approveTeacher - 批准師傅申請
   - 輸入：{ teacherId: number, approvalNotes?: string }
   - 操作：
     a) 更新 teacherProfiles 的 status 為 'approved'
     b) 設置 approvedAt 為當前時間，approvedBy 為當前用戶 ID
     c) 在 teacher_approval_history 插入記錄
   - 返回：{ success: true, message: '師傅已批准' }

3. superadmin.rejectTeacher - 拒絕師傅申請
   - 輸入：{ teacherId: number, rejectionReason: string }
   - 操作：
     a) 更新 teacherProfiles 的 status 為 'rejected'
     b) 設置 rejectionReason
     c) 在 teacher_approval_history 插入記錄
   - 返回：{ success: true, message: '師傅申請已拒絕' }

4. teachers.getApprovalStatus - 師傅查詢自己的審核狀態
   - 輸入：無
   - 返回：{ status: 'pending'|'approved'|'rejected', rejectionReason?: string, approvedAt?: Date }

使用 Zod 驗證所有輸入，使用 superadminProcedure 限制權限。
```

#### GitHub Copilot 提示詞 1.2：更新搜索 API
```
修改 teachers.search 路由：

添加過濾條件：
- 公開搜索時，只返回 status = 'approved' 的師傅
- 師傅自己查詢時，返回所有狀態（包括自己的 pending）

修改返回數據結構，添加 status 欄位（僅管理員可見）
```

### 🎨 前端 UI 實現

#### GitHub Copilot 提示詞 1.3：管理員審核頁面
```
在 client/src/components 中創建 TeacherApprovalPanel.tsx：

功能需求：
1. 顯示待審核師傅列表（分頁，每頁 10 個）
2. 每個師傅卡片顯示：
   - 頭像、名稱、專業類別
   - 簡介、服務項目、收費標準
   - 提交時間
3. 操作按鈕：
   - 「查看詳情」- 打開對話框顯示完整資料
   - 「批准」- 彈出輸入框，可選填批准備註
   - 「拒絕」- 彈出輸入框，必須填拒絕原因
4. 批准/拒絕後，列表自動刷新
5. 顯示成功/失敗提示

使用 shadcn/ui 組件：Dialog, Button, Card, Badge, Pagination
使用 trpc hooks 調用後端 API
```

#### GitHub Copilot 提示詞 1.4：師傅申請狀態頁面
```
在 client/src/pages 中創建 TeacherApprovalStatus.tsx：

功能需求：
1. 顯示當前師傅的審核狀態
2. 如果 status = 'pending'：
   - 顯示「審核中」狀態
   - 提示「您的申請正在審核，通常需要 1-2 個工作日」
   - 顯示提交時間
3. 如果 status = 'approved'：
   - 顯示「已批准」狀態
   - 顯示批准時間
   - 提供「進入儀表板」按鈕
4. 如果 status = 'rejected'：
   - 顯示「已拒絕」狀態
   - 顯示拒絕原因
   - 提供「重新申請」按鈕
5. 添加到老師儀表板的導航中

使用 shadcn/ui 組件：Card, Badge, Button, Alert
```

#### GitHub Copilot 提示詞 1.5：更新老師註冊流程
```
修改 client/src/pages/TeacherRegister.tsx：

1. 註冊完成後，顯示「申請已提交」頁面
2. 提示用戶「您的申請已提交給管理員審核」
3. 提供「查看審核狀態」按鈕，跳轉到 TeacherApprovalStatus 頁面
4. 禁止未批准的師傅訪問儀表板（在路由層面檢查）
```

### 🧪 測試

#### GitHub Copilot 提示詞 1.6：編寫單元測試
```
在 server/teacher-approval.test.ts 中編寫以下測試：

1. 測試 getPendingTeachers
   - 驗證只返回 status = 'pending' 的師傅
   - 驗證分頁功能正確

2. 測試 approveTeacher
   - 驗證師傅狀態更新為 'approved'
   - 驗證 approvedAt 和 approvedBy 被設置
   - 驗證歷史記錄被插入
   - 驗證非 superadmin 用戶無法調用

3. 測試 rejectTeacher
   - 驗證師傅狀態更新為 'rejected'
   - 驗證拒絕原因被保存
   - 驗證必須提供拒絕原因

4. 測試搜索 API
   - 驗證公開搜索不返回 pending/rejected 師傅
   - 驗證師傅自己可以看到自己的 pending 狀態

運行測試：pnpm test teacher-approval.test.ts
```

---

## 2. Google Calendar 整合

### 📌 功能描述
師傅授權連接 Google Calendar，系統自動同步其忙碌時段。預約系統自動避開已佔用時間，防止撞期。

### 🔑 環境設置

#### GitHub Copilot 提示詞 2.1：設置 Google OAuth
```
在 Google Cloud Console 中：

1. 創建 OAuth 2.0 認證
2. 添加重定向 URI：
   - 開發環境：http://localhost:3000/auth/google/callback
   - 生產環境：https://yourdomain.com/auth/google/callback
3. 獲取 Client ID 和 Client Secret
4. 在 .env 中添加：
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_CALENDAR_SCOPE=https://www.googleapis.com/auth/calendar.readonly

在 server/_core/env.ts 中添加這些環境變數
```

### 🗄️ 數據庫設計

#### GitHub Copilot 提示詞 2.2：創建 Google Calendar 表
```sql
-- 存儲師傅的 Google Calendar 授權信息
CREATE TABLE google_calendar_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacherProfileId INT NOT NULL UNIQUE,
  accessToken VARCHAR(500) NOT NULL,
  refreshToken VARCHAR(500) NOT NULL,
  expiresAt DATETIME NOT NULL,
  calendarId VARCHAR(255) NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  connectedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (teacherProfileId) REFERENCES teacherProfiles(id) ON DELETE CASCADE
);

-- 存儲同步的忙碌時段
CREATE TABLE google_calendar_busy_slots (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacherProfileId INT NOT NULL,
  eventId VARCHAR(255) NOT NULL,
  eventTitle VARCHAR(255),
  startTime DATETIME NOT NULL,
  endTime DATETIME NOT NULL,
  syncedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacherProfileId) REFERENCES teacherProfiles(id) ON DELETE CASCADE,
  INDEX idx_teacher_time (teacherProfileId, startTime, endTime)
);
```

### 🔧 後端 API 實現

#### GitHub Copilot 提示詞 2.3：Google Calendar OAuth 流程
```
在 server/routers.ts 中添加以下 tRPC 路由：

1. teachers.getGoogleCalendarAuthUrl - 獲取 Google OAuth 授權 URL
   - 輸入：無
   - 返回：{ authUrl: string }
   - 使用 google-auth-library 生成授權 URL

2. teachers.connectGoogleCalendar - 處理 OAuth 回調
   - 輸入：{ code: string }
   - 操作：
     a) 使用 code 交換 access_token 和 refresh_token
     b) 調用 Google Calendar API 獲取日曆列表
     c) 在 google_calendar_tokens 表中保存令牌
     d) 立即同步一次忙碌時段
   - 返回：{ success: true, calendarId: string }

3. teachers.disconnectGoogleCalendar - 斷開連接
   - 輸入：無
   - 操作：
     a) 刪除 google_calendar_tokens 記錄
     b) 刪除相關的 google_calendar_busy_slots 記錄
   - 返回：{ success: true }

4. teachers.syncGoogleCalendarBusySlots - 手動同步忙碌時段
   - 輸入：無
   - 操作：
     a) 獲取師傅的 Google Calendar 令牌
     b) 調用 Google Calendar API 獲取未來 90 天的事件
     c) 過濾出忙碌事件（showAs = 'busy'）
     d) 清空舊的 busy_slots，插入新的
   - 返回：{ success: true, syncedCount: number }

5. teachers.getCalendarBusySlots - 獲取忙碌時段
   - 輸入：{ teacherProfileId: number, startDate: Date, endDate: Date }
   - 返回：{ busySlots: Array<{startTime, endTime}> }

使用 googleapis npm 包調用 Google Calendar API
```

#### GitHub Copilot 提示詞 2.4：自動同步定時任務
```
在 server/_core/scheduler.ts 中添加：

使用 node-cron 或 bull 創建定時任務：

1. 每天凌晨 2 點執行一次全量同步
   - 遍歷所有已連接 Google Calendar 的師傅
   - 調用 syncGoogleCalendarBusySlots
   - 記錄同步結果和錯誤

2. 令牌刷新任務
   - 檢查所有令牌的過期時間
   - 在過期前 1 小時自動刷新
   - 更新 google_calendar_tokens 表

3. 錯誤處理
   - 如果同步失敗，記錄日誌
   - 發送通知給師傅（可選）
```

### 🎨 前端 UI 實現

#### GitHub Copilot 提示詞 2.5：Google Calendar 連接組件
```
在 client/src/components 中創建 GoogleCalendarConnect.tsx：

功能需求：
1. 顯示連接狀態
   - 未連接：顯示「連接 Google Calendar」按鈕
   - 已連接：顯示「已連接」標籤 + 日曆 ID + 「斷開連接」按鈕
2. 連接流程：
   - 點擊「連接」按鈕 → 跳轉到 Google OAuth 授權頁面
   - 用戶授權後回到應用 → 顯示成功提示
3. 同步狀態：
   - 顯示最後同步時間
   - 提供「立即同步」按鈕
   - 同步中顯示加載動畫
4. 說明文案：
   - 解釋為什麼需要連接（自動避免撞期）
   - 說明隱私政策（只讀取忙碌信息，不讀取事件詳情）

使用 shadcn/ui 組件：Button, Card, Badge, Alert
```

#### GitHub Copilot 提示詞 2.6：預約時段選擇優化
```
修改 client/src/pages/BookingPage.tsx 或預約組件：

1. 獲取師傅的忙碌時段
   - 調用 teachers.getCalendarBusySlots API
2. 在日曆或時段選擇器中：
   - 灰顯忙碌時段（不可選）
   - 綠色標記可用時段
   - 顯示提示「此時段已被佔用」
3. 防止用戶選擇忙碌時段
   - 在提交前驗證選擇的時段不在忙碌列表中
```

### 🧪 測試

#### GitHub Copilot 提示詞 2.7：編寫集成測試
```
在 server/google-calendar.test.ts 中編寫以下測試：

1. 測試 OAuth 流程
   - 驗證生成的授權 URL 包含正確的 scope
   - 模擬 OAuth 回調，驗證令牌被正確保存

2. 測試忙碌時段同步
   - 模擬 Google Calendar API 返回事件列表
   - 驗證忙碌事件被正確提取和存儲
   - 驗證舊的忙碌時段被清空

3. 測試預約衝突檢測
   - 創建忙碌時段
   - 嘗試在忙碌時段預約 → 應失敗
   - 嘗試在可用時段預約 → 應成功

4. 測試令牌刷新
   - 模擬令牌過期
   - 驗證自動刷新機制

運行測試：pnpm test google-calendar.test.ts
```

---

## 3. 師傅儀表板增強

### 📌 功能描述
增強師傅儀表板，添加收入統計、客戶數據、預約分析等功能。

### 🔧 後端 API 實現

#### GitHub Copilot 提示詞 3.1：統計 API
```
在 server/routers.ts 中添加以下 tRPC 路由到 teacherDashboard：

1. getIncomeStats - 獲取收入統計
   - 輸入：{ period: 'month'|'year'|'all' }
   - 返回：{
       totalIncome: number,
       thisMonthIncome: number,
       lastMonthIncome: number,
       thisYearIncome: number,
       lastYearIncome: number,
       averagePerBooking: number,
       incomeByMonth: Array<{month: string, income: number}>
     }
   - 查詢條件：bookings.status = 'completed'，sum price

2. getBookingStats - 獲取預約統計
   - 輸入：{ period: 'month'|'year'|'all' }
   - 返回：{
       totalBookings: number,
       thisMonthBookings: number,
       completedBookings: number,
       cancelledBookings: number,
       pendingBookings: number,
       bookingsByStatus: {pending, confirmed, completed, cancelled},
       bookingsByMonth: Array<{month: string, count: number}>
     }

3. getClientStats - 獲取客戶數據
   - 輸入：{ limit: number = 10 }
   - 返回：Array<{
       userId: number,
       userName: string,
       userAvatar: string,
       totalBookings: number,
       totalSpent: number,
       lastBookingDate: Date,
       averageRating: number
     }>

4. getReviewStats - 獲取評價統計
   - 輸入：無
   - 返回：{
       averageRating: number,
       totalReviews: number,
       ratingDistribution: {1: count, 2: count, 3: count, 4: count, 5: count},
       recentReviews: Array<{rating, comment, userName, date}>
     }

所有路由使用 teacherProcedure 限制權限
```

### 🎨 前端 UI 實現

#### GitHub Copilot 提示詞 3.2：增強儀表板組件
```
修改 client/src/pages/TeacherDashboard.tsx：

1. 添加新的統計卡片到儀表板頂部：
   - 本月收入 + 環比增長
   - 本月預約數 + 環比增長
   - 平均評分 + 評價總數
   - 活躍客戶數

2. 添加新的標籤頁：
   - 「收入報表」- 顯示收入趨勢圖表
   - 「客戶管理」- 顯示客戶列表和互動記錄
   - 「評價管理」- 顯示評價列表和回覆功能

3. 收入報表頁面：
   - 使用 Recharts 繪製折線圖
   - X 軸：月份，Y 軸：收入金額
   - 顯示本月、本年、全部數據的切換按鈕
   - 顯示關鍵指標（總收入、平均每筆、最高月份等）

4. 客戶管理頁面：
   - 表格顯示客戶列表（名稱、預約次數、總消費、最後預約時間、評分）
   - 可按預約次數或消費金額排序
   - 點擊客戶可查看詳細互動記錄

5. 評價管理頁面：
   - 顯示最近的評價
   - 可按評分篩選
   - 提供回覆功能（文本框 + 提交按鈕）

使用 shadcn/ui 和 Recharts 組件
```

#### GitHub Copilot 提示詞 3.3：數據可視化
```
在 client/src/components 中創建以下組件：

1. IncomeChart.tsx - 收入趨勢圖表
   - 輸入：incomeByMonth 數據
   - 使用 Recharts LineChart
   - 顯示月份和收入金額

2. BookingStatsCard.tsx - 預約統計卡片
   - 輸入：bookingStats 數據
   - 顯示各狀態的預約數量
   - 使用進度條或圓形圖表

3. ClientTable.tsx - 客戶列表表格
   - 輸入：clients 數據
   - 可排序、可篩選
   - 顯示客戶頭像、名稱、互動數據

4. ReviewCard.tsx - 評價卡片
   - 輸入：review 數據
   - 顯示評分、評論、用戶信息
   - 提供回覆文本框
```

### 🧪 測試

#### GitHub Copilot 提示詞 3.4：編寫測試
```
在 server/dashboard-stats.test.ts 中編寫以下測試：

1. 測試 getIncomeStats
   - 驗證計算邏輯正確（只計算 completed 訂單）
   - 驗證按月份分組正確
   - 驗證環比計算正確

2. 測試 getBookingStats
   - 驗證各狀態計數正確
   - 驗證按月份分組正確

3. 測試 getClientStats
   - 驗證按預約次數排序
   - 驗證只返回該師傅的客戶

4. 測試 getReviewStats
   - 驗證評分分佈計算正確
   - 驗證平均評分計算正確

運行測試：pnpm test dashboard-stats.test.ts
```

---

## 4. 課程管理系統

### 📌 功能描述
師傅可以開設並管理教學課程，用戶可以報名課程，師傅可以追蹤學生進度。

### 🗄️ 數據庫設計

#### GitHub Copilot 提示詞 4.1：創建課程表
```sql
-- 課程表
CREATE TABLE courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacherProfileId INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
  duration INT NOT NULL COMMENT '課程時長（分鐘）',
  price DECIMAL(10, 2) NOT NULL,
  maxStudents INT,
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  imageUrl VARCHAR(500),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (teacherProfileId) REFERENCES teacherProfiles(id) ON DELETE CASCADE,
  INDEX idx_teacher (teacherProfileId),
  INDEX idx_status (status)
);

-- 課程課次表
CREATE TABLE course_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  courseId INT NOT NULL,
  sessionNumber INT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  scheduledAt DATETIME NOT NULL,
  duration INT NOT NULL COMMENT '課次時長（分鐘）',
  status ENUM('scheduled', 'ongoing', 'completed', 'cancelled') DEFAULT 'scheduled',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_course_session (courseId, sessionNumber),
  INDEX idx_scheduled (scheduledAt)
);

-- 課程報名表
CREATE TABLE course_enrollments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  courseId INT NOT NULL,
  userId INT NOT NULL,
  enrolledAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'completed', 'dropped') DEFAULT 'active',
  progress INT DEFAULT 0 COMMENT '完成百分比',
  FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (courseId, userId),
  INDEX idx_user (userId)
);

-- 課次出席記錄
CREATE TABLE session_attendance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sessionId INT NOT NULL,
  userId INT NOT NULL,
  attendedAt DATETIME,
  status ENUM('attended', 'absent', 'excused') DEFAULT 'absent',
  FOREIGN KEY (sessionId) REFERENCES course_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_attendance (sessionId, userId)
);
```

### 🔧 後端 API 實現

#### GitHub Copilot 提示詞 4.2：課程管理 API
```
在 server/routers.ts 中添加以下 tRPC 路由到 teacherDashboard：

1. createCourse - 創建課程
   - 輸入：{ title, description, category, level, duration, price, maxStudents, imageUrl }
   - 驗證：title 和 price 必填，price > 0，duration > 0
   - 返回：{ courseId: number, success: true }

2. updateCourse - 編輯課程
   - 輸入：{ courseId, ...courseData }
   - 驗證：只能編輯自己的課程，status = 'draft' 時可編輯
   - 返回：{ success: true }

3. publishCourse - 發佈課程
   - 輸入：{ courseId }
   - 操作：status 從 'draft' 變為 'published'
   - 返回：{ success: true }

4. archiveCourse - 歸檔課程
   - 輸入：{ courseId }
   - 操作：status 變為 'archived'
   - 返回：{ success: true }

5. getMyCourses - 獲取我的課程列表
   - 輸入：{ status?: 'draft'|'published'|'archived' }
   - 返回：Array<{id, title, status, enrollmentCount, createdAt}>

6. getCourseDetail - 獲取課程詳情
   - 輸入：{ courseId }
   - 返回：{id, title, description, price, maxStudents, enrollmentCount, sessions[], enrollments[]}

7. addCourseSession - 添加課次
   - 輸入：{ courseId, sessionNumber, title, scheduledAt, duration }
   - 驗證：sessionNumber 不重複，scheduledAt 在未來
   - 返回：{ sessionId: number }

8. updateSessionStatus - 更新課次狀態
   - 輸入：{ sessionId, status: 'scheduled'|'ongoing'|'completed'|'cancelled' }
   - 返回：{ success: true }

9. recordAttendance - 記錄出席
   - 輸入：{ sessionId, userId, status: 'attended'|'absent'|'excused' }
   - 返回：{ success: true }

所有路由使用 teacherProcedure 限制權限
```

#### GitHub Copilot 提示詞 4.3：學生端 API
```
在 server/routers.ts 中添加以下 tRPC 路由到 courses（新建）：

1. courses.search - 搜索課程
   - 輸入：{ category?, level?, minPrice?, maxPrice?, keyword?, limit?, offset? }
   - 返回：Array<{id, title, teacher, price, level, enrollmentCount, rating}>
   - 只返回 status = 'published' 的課程

2. courses.getDetail - 獲取課程詳情
   - 輸入：{ courseId }
   - 返回：{id, title, description, teacher, price, level, maxStudents, enrollmentCount, sessions[], reviews[]}

3. courses.enroll - 報名課程
   - 輸入：{ courseId }
   - 驗證：用戶未報名過，課程未滿員
   - 操作：在 course_enrollments 插入記錄，處理支付
   - 返回：{ enrollmentId: number, success: true }

4. courses.getMyCourses - 獲取我報名的課程
   - 輸入：{ status?: 'active'|'completed'|'dropped' }
   - 返回：Array<{courseId, title, teacher, progress, nextSession}>

5. courses.getSessionDetail - 獲取課次詳情
   - 輸入：{ sessionId }
   - 返回：{id, title, scheduledAt, duration, attendanceStatus, recordedAt}

使用 protectedProcedure 限制權限
```

### 🎨 前端 UI 實現

#### GitHub Copilot 提示詞 4.4：師傅課程管理頁面
```
在 client/src/components 中創建 CourseManagement.tsx：

功能需求：
1. 課程列表視圖
   - 顯示草稿、已發佈、已歸檔課程（標籤頁切換）
   - 每個課程卡片顯示：標題、狀態、報名人數、創建時間
   - 操作按鈕：編輯、發佈/歸檔、刪除、查看詳情

2. 創建/編輯課程對話框
   - 表單欄位：標題、描述、分類、難度、時長、價格、最大學生數、封面圖
   - 驗證：標題必填，價格 > 0
   - 提交後返回列表

3. 課程詳情頁面
   - 顯示課程基本信息
   - 課次列表（表格）：課次號、標題、時間、狀態
   - 添加課次按鈕 → 對話框輸入課次信息
   - 學生列表（表格）：名稱、報名時間、進度、出席情況
   - 出席記錄功能：選擇課次 → 標記學生出席

使用 shadcn/ui 組件：Dialog, Button, Card, Table, Tabs
```

#### GitHub Copilot 提示詞 4.5：學生課程頁面
```
在 client/src/pages 中創建 CoursesPage.tsx 和 CourseDetailPage.tsx：

1. 課程列表頁面 (CoursesPage.tsx)
   - 搜索和篩選：分類、難度、價格範圍
   - 課程卡片網格顯示：封面、標題、師傅名稱、價格、評分、報名人數
   - 點擊卡片進入詳情頁

2. 課程詳情頁面 (CourseDetailPage.tsx)
   - 課程信息：封面、標題、師傅、描述、價格、難度、報名人數
   - 課次列表：顯示所有課次的時間和狀態
   - 報名按鈕：未報名時顯示，點擊進行支付
   - 我的進度：已報名時顯示進度條和已完成課次

3. 我的課程頁面
   - 標籤頁：進行中、已完成、已退課
   - 每個課程顯示進度、下次課次時間、師傅聯絡方式
   - 點擊課程進入詳情
```

### 🧪 測試

#### GitHub Copilot 提示詞 4.6：編寫測試
```
在 server/courses.test.ts 中編寫以下測試：

1. 測試課程創建和發佈
   - 驗證課程初始狀態為 'draft'
   - 驗證發佈後狀態變為 'published'

2. 測試課程搜索
   - 驗證只返回 'published' 課程
   - 驗證篩選功能正確

3. 測試課程報名
   - 驗證用戶可以報名課程
   - 驗證不能重複報名
   - 驗證滿員時無法報名

4. 測試出席記錄
   - 驗證師傅可以記錄學生出席
   - 驗證進度計算正確

運行測試：pnpm test courses.test.ts
```

---

## 5. 即時通知系統

### 📌 功能描述
當有新預約、狀態變更、課程提醒等事件時，自動發送 Email 和應用內通知。

### 🗄️ 數據庫設計

#### GitHub Copilot 提示詞 5.1：創建通知表
```sql
-- 通知表
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  type VARCHAR(50) NOT NULL COMMENT 'booking_created, booking_confirmed, course_reminder 等',
  title VARCHAR(255) NOT NULL,
  message TEXT,
  relatedId INT COMMENT '相關的預約、課程等 ID',
  relatedType VARCHAR(50) COMMENT 'booking, course, review 等',
  isRead BOOLEAN DEFAULT FALSE,
  readAt DATETIME NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read (userId, isRead),
  INDEX idx_created (createdAt)
);

-- Email 日誌表
CREATE TABLE email_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  recipientEmail VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  type VARCHAR(50),
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  errorMessage TEXT,
  sentAt DATETIME NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status)
);
```

### 🔧 後端 API 實現

#### GitHub Copilot 提示詞 5.2：通知服務
```
在 server/_core/notifications.ts 中創建通知服務：

1. 創建函數 sendNotification(userId, type, title, message, relatedId, relatedType)
   - 在 notifications 表插入記錄
   - 調用 sendEmail 發送郵件
   - 返回 notificationId

2. 創建函數 sendEmail(userId, subject, template, data)
   - 根據 template 類型選擇郵件模板
   - 使用 nodemailer 或 SendGrid 發送
   - 在 email_logs 記錄發送狀態
   - 支援的模板：
     a) booking_created - 新預約通知（師傅）
     b) booking_confirmed - 預約已確認通知（用戶）
     c) booking_reminder - 預約提醒（用戶和師傅，提前 24 小時）
     d) course_reminder - 課程開始提醒（學生，提前 1 小時）
     e) course_enrolled - 課程報名確認（師傅）

3. 創建函數 getNotifications(userId, limit, offset, isRead)
   - 查詢用戶的通知列表
   - 支援按已讀/未讀篩選

4. 創建函數 markAsRead(notificationId)
   - 更新通知的 isRead 和 readAt

使用 nodemailer 和 ejs 模板引擎
```

#### GitHub Copilot 提示詞 5.3：通知觸發點
```
在以下位置添加通知觸發：

1. 創建預約時 (bookings.create)
   - 發送通知給師傅：「新預約：{用戶名} 預約了 {服務名}」
   - 發送確認郵件給用戶

2. 師傅確認預約時 (bookings.confirm)
   - 發送通知給用戶：「預約已確認，時間為 {時間}」

3. 預約前 24 小時
   - 定時任務：每小時檢查一次
   - 發送提醒通知給用戶和師傅

4. 課程報名時 (courses.enroll)
   - 發送通知給師傅：「{用戶名} 報名了課程 {課程名}」
   - 發送確認郵件給用戶

5. 課程開始前 1 小時
   - 定時任務：每 15 分鐘檢查一次
   - 發送提醒通知給所有報名學生

6. 評價提交時 (reviews.create)
   - 發送通知給師傅：「{用戶名} 給了您 {評分} 星評價」
```

#### GitHub Copilot 提示詞 5.4：通知 API
```
在 server/routers.ts 中添加以下 tRPC 路由到 notifications（新建）：

1. notifications.getList - 獲取通知列表
   - 輸入：{ limit: 20, offset: 0, isRead?: boolean }
   - 返回：Array<{id, type, title, message, relatedId, createdAt, isRead}>

2. notifications.getUnreadCount - 獲取未讀通知數
   - 輸入：無
   - 返回：{ unreadCount: number }

3. notifications.markAsRead - 標記為已讀
   - 輸入：{ notificationId }
   - 返回：{ success: true }

4. notifications.markAllAsRead - 標記全部為已讀
   - 輸入：無
   - 返回：{ success: true }

5. notifications.delete - 刪除通知
   - 輸入：{ notificationId }
   - 返回：{ success: true }

使用 protectedProcedure 限制權限
```

### 🎨 前端 UI 實現

#### GitHub Copilot 提示詞 5.5：通知中心組件
```
在 client/src/components 中創建 NotificationCenter.tsx：

功能需求：
1. 通知鈴鐺圖標
   - 位於頂部導航欄
   - 顯示未讀通知數（紅色徽章）
   - 點擊打開通知面板

2. 通知面板
   - 顯示最近 20 條通知
   - 按時間倒序排列
   - 未讀通知高亮顯示
   - 每條通知顯示：類型圖標、標題、消息摘要、時間

3. 操作
   - 點擊通知進入相關頁面（預約詳情、課程詳情等）
   - 點擊標記為已讀
   - 「全部標記為已讀」按鈕
   - 刪除通知按鈕

4. 通知頁面 (NotificationsPage.tsx)
   - 完整通知列表（分頁）
   - 篩選：全部、未讀、預約、課程、評價
   - 每條通知可點擊查看詳情

使用 shadcn/ui 組件：Badge, Button, Card, Tabs
使用 trpc hooks 調用 API
```

#### GitHub Copilot 提示詞 5.6：郵件模板
```
在 server/email-templates 目錄中創建以下 EJS 模板：

1. booking_created.ejs - 新預約通知（師傅）
   內容：
   - 親愛的 {師傅名稱}
   - 您有新預約：{用戶名} 預約了 {服務名}
   - 預約時間：{時間}
   - 預約金額：{金額}
   - 「查看詳情」按鈕

2. booking_confirmed.ejs - 預約確認通知（用戶）
   內容：
   - 親愛的 {用戶名}
   - 您的預約已確認
   - 師傅：{師傅名稱}
   - 時間：{時間}
   - 地點：{地點}
   - 「查看預約」按鈕

3. booking_reminder.ejs - 預約提醒
   內容：
   - 親愛的 {用戶/師傅名稱}
   - 提醒：您有一個預約即將開始
   - 時間：{時間}（距離現在 24 小時）
   - 「查看詳情」按鈕

4. course_reminder.ejs - 課程開始提醒
   內容：
   - 親愛的 {學生名稱}
   - 課程即將開始
   - 課程：{課程名稱}
   - 師傅：{師傅名稱}
   - 開始時間：{時間}（距離現在 1 小時）
   - 「進入課程」按鈕

5. course_enrolled.ejs - 課程報名確認（師傅）
   內容：
   - 親愛的 {師傅名稱}
   - {用戶名} 報名了您的課程 {課程名稱}
   - 報名時間：{時間}
   - 「查看詳情」按鈕

使用 HTML 和 CSS 美化，包含公司 Logo 和品牌顏色
```

### 🧪 測試

#### GitHub Copilot 提示詞 5.7：編寫測試
```
在 server/notifications.test.ts 中編寫以下測試：

1. 測試通知創建
   - 驗證通知被正確插入數據庫
   - 驗證郵件被發送

2. 測試通知查詢
   - 驗證只返回該用戶的通知
   - 驗證分頁功能正確

3. 測試未讀計數
   - 驗證計數正確
   - 驗證標記為已讀後計數減少

4. 測試郵件發送
   - 模擬 nodemailer
   - 驗證郵件內容正確
   - 驗證發送狀態被記錄

5. 測試定時任務
   - 模擬時間流逝
   - 驗證提醒通知在正確時間發送

運行測試：pnpm test notifications.test.ts
```

---

## 6. 支付系統優化

### 📌 功能描述
從模擬支付升級到真實 Stripe/PayMe 集成，支持訂單支付、課程報名支付、退款等。

### 🔧 環境設置

#### GitHub Copilot 提示詞 6.1：Stripe 配置
```
在 Stripe Dashboard 中：

1. 獲取 API Keys
   - Publishable Key（前端使用）
   - Secret Key（後端使用）

2. 在 .env 中添加：
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...

3. 配置 Webhook
   - 在 Stripe Dashboard 設置 Webhook 端點
   - URL：https://yourdomain.com/api/webhooks/stripe
   - 監聽事件：payment_intent.succeeded, payment_intent.payment_failed, charge.refunded

在 server/_core/env.ts 中添加這些環境變數
```

### 🗄️ 數據庫設計

#### GitHub Copilot 提示詞 6.2：支付記錄表
```sql
-- 支付記錄表
CREATE TABLE payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'HKD',
  status ENUM('pending', 'succeeded', 'failed', 'refunded') DEFAULT 'pending',
  type VARCHAR(50) NOT NULL COMMENT 'booking, course 等',
  relatedId INT NOT NULL COMMENT '相關的預約或課程 ID',
  stripePaymentIntentId VARCHAR(255) UNIQUE,
  stripeChargeId VARCHAR(255),
  paymentMethod VARCHAR(50) COMMENT 'card, apple_pay, google_pay 等',
  paidAt DATETIME NULL,
  refundedAt DATETIME NULL,
  refundAmount DECIMAL(10, 2),
  refundReason VARCHAR(255),
  metadata JSON,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (userId),
  INDEX idx_status (status),
  INDEX idx_stripe_intent (stripePaymentIntentId)
);

-- 發票表
CREATE TABLE invoices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  paymentId INT NOT NULL UNIQUE,
  invoiceNumber VARCHAR(50) UNIQUE,
  teacherId INT NOT NULL,
  amount DECIMAL(10, 2),
  issuedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  dueAt DATETIME,
  paidAt DATETIME NULL,
  pdfUrl VARCHAR(500),
  FOREIGN KEY (paymentId) REFERENCES payments(id),
  FOREIGN KEY (teacherId) REFERENCES teacherProfiles(id)
);
```

### 🔧 後端 API 實現

#### GitHub Copilot 提示詞 6.3：Stripe 支付 API
```
在 server/routers.ts 中添加以下 tRPC 路由到 payments（新建）：

1. payments.createPaymentIntent - 創建支付意圖
   - 輸入：{ amount, type: 'booking'|'course', relatedId, description }
   - 操作：
     a) 在 payments 表插入記錄（status = 'pending'）
     b) 調用 Stripe API 創建 PaymentIntent
     c) 返回 clientSecret 給前端
   - 返回：{ clientSecret: string, paymentId: number }

2. payments.confirmPayment - 確認支付（Webhook 調用）
   - 輸入：{ stripePaymentIntentId, stripeChargeId }
   - 操作：
     a) 更新 payments 表（status = 'succeeded', paidAt = now）
     b) 如果 type = 'booking'，更新 bookings 表（status = 'confirmed'）
     c) 如果 type = 'course'，更新 course_enrollments 表（status = 'active'）
     d) 發送支付成功通知
     e) 生成發票
   - 返回：{ success: true }

3. payments.handleWebhook - 處理 Stripe Webhook
   - 驗證 Webhook 簽名
   - 根據事件類型調用相應函數
   - 支持的事件：payment_intent.succeeded, payment_intent.payment_failed, charge.refunded

4. payments.refund - 退款
   - 輸入：{ paymentId, reason }
   - 驗證：只能退款 succeeded 的支付
   - 操作：
     a) 調用 Stripe API 退款
     b) 更新 payments 表（status = 'refunded'）
     c) 如果 type = 'booking'，更新 bookings 表（status = 'cancelled'）
     d) 發送退款通知
   - 返回：{ success: true, refundId: string }

5. payments.getPaymentHistory - 獲取支付歷史
   - 輸入：{ limit: 20, offset: 0 }
   - 返回：Array<{id, amount, status, type, relatedId, createdAt}>

6. payments.getInvoice - 獲取發票
   - 輸入：{ paymentId }
   - 返回：{ invoiceNumber, pdfUrl, amount, issuedAt }

使用 stripe npm 包
使用 protectedProcedure 限制權限
```

#### GitHub Copilot 提示詞 6.4：發票生成
```
在 server/_core/invoice.ts 中創建發票服務：

1. 創建函數 generateInvoice(paymentId)
   - 查詢 payments 和相關數據
   - 使用 PDFKit 或 html2pdf 生成 PDF
   - 上傳到 S3
   - 在 invoices 表插入記錄
   - 返回 pdfUrl

2. 發票內容
   - 公司信息（Logo、名稱、地址、稅號）
   - 發票號、發票日期、到期日期
   - 客戶信息（名稱、郵箱）
   - 服務詳情（服務名稱、金額、稅率）
   - 總金額、支付方式、支付日期
   - 條款和條件

3. 郵件發送
   - 支付成功後自動發送發票 PDF 給用戶
```

### 🎨 前端 UI 實現

#### GitHub Copilot 提示詞 6.5：支付頁面
```
在 client/src/pages 中創建或修改 PaymentPage.tsx：

功能需求：
1. 支付表單
   - 顯示訂單摘要（服務/課程名稱、金額、日期）
   - 使用 Stripe Elements 或 Stripe Payment Element
   - 支持多種支付方式：信用卡、Apple Pay、Google Pay
   - 顯示安全標誌和隱私政策

2. 支付流程
   - 點擊「確認支付」按鈕
   - 調用 payments.createPaymentIntent API
   - 使用 Stripe.js 確認支付
   - 支付中顯示加載動畫
   - 支付成功顯示確認頁面
   - 支付失敗顯示錯誤信息和重試按鈕

3. 確認頁面
   - 顯示「支付成功」
   - 顯示訂單號、金額、時間
   - 提供「下載發票」按鈕
   - 提供「返回首頁」或「查看訂單」按鈕

使用 @stripe/react-stripe-js 和 @stripe/stripe-js
使用 shadcn/ui 組件
```

#### GitHub Copilot 提示詞 6.6：支付歷史頁面
```
在 client/src/pages 中創建 PaymentHistoryPage.tsx：

功能需求：
1. 支付列表
   - 表格顯示：日期、類型、金額、狀態、操作
   - 可按狀態篩選（全部、成功、失敗、已退款）
   - 可按日期排序

2. 操作
   - 「查看詳情」- 顯示支付詳情和發票
   - 「下載發票」- 下載 PDF 發票
   - 「申請退款」- 如果支付成功，可申請退款

3. 退款流程
   - 點擊「申請退款」
   - 彈出對話框，輸入退款原因
   - 提交後顯示確認信息
   - 退款成功後更新列表

使用 shadcn/ui 組件：Table, Button, Dialog, Badge
```

### 🧪 測試

#### GitHub Copilot 提示詞 6.7：編寫測試
```
在 server/payments.test.ts 中編寫以下測試：

1. 測試 createPaymentIntent
   - 驗證 PaymentIntent 被創建
   - 驗證 payments 記錄被插入
   - 驗證返回 clientSecret

2. 測試 confirmPayment
   - 模擬 Stripe Webhook
   - 驗證 payments 狀態更新為 'succeeded'
   - 驗證相關訂單/課程狀態更新
   - 驗證通知被發送

3. 測試 refund
   - 驗證 Stripe 退款 API 被調用
   - 驗證 payments 狀態更新為 'refunded'
   - 驗證相關訂單狀態更新

4. 測試發票生成
   - 驗證 PDF 被生成
   - 驗證發票記錄被插入
   - 驗證郵件被發送

5. 測試支付失敗
   - 模擬支付失敗 Webhook
   - 驗證 payments 狀態更新為 'failed'
   - 驗證用戶收到失敗通知

運行測試：pnpm test payments.test.ts
```

---

## 📚 使用指南

### 如何使用這份文檔

1. **複製提示詞** - 找到您要實現的功能，複製相應的 GitHub Copilot 提示詞
2. **粘貼到 Copilot** - 在 GitHub Copilot Chat 中粘貼提示詞
3. **讓 Copilot 生成代碼** - Copilot 會根據提示詞生成相應的代碼
4. **審查和調整** - 檢查生成的代碼，根據需要調整
5. **集成到項目** - 將代碼集成到 SoulGuide 項目中
6. **運行測試** - 執行相應的測試確保功能正常

### 提示詞結構說明

每個功能都按以下結構組織：

- **📌 功能描述** - 簡要說明功能的目的
- **🗄️ 數據庫設計** - SQL 建表語句
- **🔧 後端 API 實現** - tRPC 路由和業務邏輯
- **🎨 前端 UI 實現** - React 組件和頁面
- **🧪 測試** - 單元測試和集成測試

### 優先級建議

1. **第一階段（必須）** - 師傅審核系統、Google Calendar 整合
2. **第二階段（重要）** - 師傅儀表板增強、即時通知系統
3. **第三階段（可選）** - 課程管理系統、支付系統優化

---

## 🚀 後續步驟

1. 選擇一個功能，複製相應的 GitHub Copilot 提示詞
2. 在 GitHub Copilot Chat 中執行提示詞
3. 根據生成的代碼進行調整和優化
4. 編寫和運行測試
5. 提交 Pull Request 進行代碼審查
6. 合併到主分支並部署

祝您開發順利！🎉
