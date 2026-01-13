-- 師傅審核系統數據庫遷移
-- 日期: 2026-01-13

-- 1. 更新 teacher_profiles 表，添加審核相關欄位
ALTER TABLE teacher_profiles 
ADD COLUMN status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending' NOT NULL AFTER isFeatured,
ADD COLUMN submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL AFTER status,
ADD COLUMN approvedAt DATETIME NULL AFTER submittedAt,
ADD COLUMN approvedBy INT NULL AFTER approvedAt,
ADD COLUMN rejectionReason VARCHAR(500) NULL AFTER approvedBy,
ADD FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL;

-- 2. 創建 teacher_approval_history 表
CREATE TABLE IF NOT EXISTS teacher_approval_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacherProfileId INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  reviewedBy INT NOT NULL,
  reviewNotes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (teacherProfileId) REFERENCES teacher_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewedBy) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_teacher_profile (teacherProfileId),
  INDEX idx_reviewed_by (reviewedBy),
  INDEX idx_created_at (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 將現有師傅的狀態設為 'approved'（可選，根據實際情況決定）
-- UPDATE teacher_profiles SET status = 'approved' WHERE status = 'pending';

-- 4. 添加索引以提高查詢性能
ALTER TABLE teacher_profiles ADD INDEX idx_status (status);
ALTER TABLE teacher_profiles ADD INDEX idx_submitted_at (submittedAt);
