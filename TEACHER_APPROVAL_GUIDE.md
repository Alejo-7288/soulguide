# 師傅審核系統實施指南

## 概述
師傅審核系統允許管理員審核新註冊的師傅申請，確保只有經過批准的師傅才能在前台展示。

## 數據庫遷移

### 手動應用 SQL 遷移
如果您有 DATABASE_URL 環境變量設置：
```bash
pnpm db:push
```

或手動執行 SQL：
```bash
mysql -u [用戶名] -p [數據庫名] < drizzle/0005_teacher_approval_system.sql
```

### 遷移內容
1. **teacher_profiles 表更新**：
   - `status`: 審核狀態 (pending, approved, rejected, suspended)
   - `submittedAt`: 提交時間
   - `approvedAt`: 批准時間
   - `approvedBy`: 批准者 ID
   - `rejectionReason`: 拒絕原因

2. **teacher_approval_history 表**：
   - 記錄所有審核操作歷史
   - 包括審核者信息和備註

## 功能特性

### 1. 師傅註冊流程
- 師傅註冊後狀態自動設為 `pending`
- 顯示「申請已提交」頁面
- 提供查看審核狀態的鏈接

### 2. 管理員審核
訪問路徑：`/admin` → 「師傅審核」標籤

功能：
- 查看所有待審核師傅列表
- 查看師傅詳細資料
- 批准申請（可選填備註）
- 拒絕申請（必須填寫原因）
- 自動分頁顯示

### 3. 師傅審核狀態頁面
訪問路徑：`/teacher/approval-status`

顯示內容：
- **審核中 (pending)**：提示等待時間，顯示審核流程
- **已批准 (approved)**：顯示批准時間，提供進入儀表板按鈕
- **已拒絕 (rejected)**：顯示拒絕原因，提供重新申請選項
- **已暫停 (suspended)**：提示聯繫管理員

### 4. 前台師傅搜索過濾
- 公開搜索只顯示 `status = 'approved'` 的師傅
- Pending/Rejected 師傅不會出現在搜索結果中

## API 端點

### 管理員 API (需要 superadmin 權限)

#### 獲取待審核師傅列表
```typescript
trpc.superadmin.getPendingTeachers.useQuery({ 
  page: 1, 
  limit: 10 
});
```

#### 批准師傅申請
```typescript
trpc.superadmin.approveTeacher.useMutation({
  teacherId: number,
  approvalNotes?: string
});
```

#### 拒絕師傅申請
```typescript
trpc.superadmin.rejectTeacher.useMutation({
  teacherId: number,
  rejectionReason: string  // 必填
});
```

### 師傅 API

#### 查詢自己的審核狀態
```typescript
trpc.teachers.getApprovalStatus.useQuery();
```

返回：
```typescript
{
  status: 'pending' | 'approved' | 'rejected' | 'suspended',
  rejectionReason?: string,
  approvedAt?: Date,
  submittedAt?: Date
}
```

## 測試

### 運行單元測試

測試需要有效的數據庫連接才能運行。

**前置條件**：
1. 設置 `DATABASE_URL` 環境變量
2. 確保數據庫已應用遷移

**運行測試**：
```bash
# 設置環境變量（示例）
export DATABASE_URL="mysql://user:password@localhost:3306/soulguide"

# 運行測試
pnpm test teacher-approval.test.ts
```

**注意**：如果沒有數據庫連接，測試會自動跳過並顯示提示訊息。

### 測試覆蓋
- ✅ 獲取待審核師傅列表
- ✅ 批准師傅申請
- ✅ 拒絕師傅申請
- ✅ 查詢審核狀態
- ✅ 搜索過濾（只顯示已批准）
- ✅ 審核歷史記錄
- ✅ 權限控制
- ✅ 邊界情況處理

## 權限控制

- **superadmin**: 可以審核師傅申請
- **teacher**: 可以查看自己的審核狀態
- **user**: 只能看到已批准的師傅

## 工作流程

```
1. 師傅註冊
   ↓
2. 狀態: pending
   ↓
3. 管理員審核
   ├─→ 批准 → status: approved → 師傅可使用系統
   └─→ 拒絕 → status: rejected → 師傅可重新申請
```

## 數據庫索引

為了提高查詢性能，已添加以下索引：
- `teacher_profiles.status`
- `teacher_profiles.submittedAt`
- `teacher_approval_history.teacherProfileId`
- `teacher_approval_history.reviewedBy`
- `teacher_approval_history.createdAt`

## 遷移現有數據

如果系統中已有師傅，建議執行以下 SQL 將他們的狀態設為已批准：
```sql
UPDATE teacher_profiles 
SET status = 'approved' 
WHERE status = 'pending';
```

## 前端組件

### 新增組件
- `TeacherApprovalPanel.tsx`: 管理員審核面板
- `TeacherApprovalStatus.tsx`: 師傅審核狀態頁面

### 更新組件
- `TeacherRegister.tsx`: 註冊成功後顯示審核提示
- `AdminDashboard.tsx`: 添加審核標籤

### 新增路由
- `/teacher/approval-status`: 師傅審核狀態頁面

## 通知系統（未來改進）

建議添加：
- 審核通過/拒絕時發送電郵通知
- 管理員收到新申請時的通知
- 狀態變更的系統通知

## 故障排查

### 問題：師傅註冊後無法在前台顯示
**解決方案**：檢查師傅的 `status` 是否為 `approved`

### 問題：管理員看不到待審核師傅
**解決方案**：
1. 確認用戶角色為 `superadmin`
2. 檢查數據庫中是否有 `status = 'pending'` 的記錄

### 問題：審核操作失敗
**解決方案**：
1. 檢查用戶權限
2. 確認 teacherId 正確
3. 查看服務器日誌

## 安全考量

- 所有審核 API 都需要 superadmin 權限
- 拒絕原因必填，防止誤操作
- 審核歷史完整記錄，可追溯所有操作
- 外鍵約束確保數據一致性

## 後續優化建議

1. **批量操作**：支持批量批准/拒絕
2. **審核評論**：管理員之間可以討論申請
3. **自動審核**：基於規則的自動審核
4. **統計報表**：審核通過率、處理時間等
5. **申請模板**：提供標準的拒絕原因模板
6. **郵件通知**：整合郵件系統
7. **申訴機制**：被拒絕的師傅可以申訴
