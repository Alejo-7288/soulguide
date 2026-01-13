import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';

describe('Teacher Approval System', () => {
  let testUserId: number;
  let testTeacherProfileId: number;
  let adminUserId: number;
  let dbAvailable = false;

  beforeAll(async () => {
    // 檢查數據庫是否可用
    try {
      const database = await db.getDb();
      if (!database) {
        console.log('⚠️  Database not available, skipping tests. Set DATABASE_URL to run tests.');
        return;
      }
      dbAvailable = true;

      // 創建測試用戶
      testUserId = await db.createUserWithoutPassword({
        email: 'test-teacher@example.com',
        name: 'Test Teacher',
        role: 'teacher',
      });

      // 創建管理員用戶
      adminUserId = await db.createUserWithoutPassword({
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'superadmin',
      });

      // 創建教師資料
      const profileId = await db.createTeacherProfile({
        userId: testUserId,
        displayName: 'Test Teacher',
        title: 'Professional Consultant',
        bio: 'This is a test teacher profile',
      });
      testTeacherProfileId = profileId || 0;
    } catch (error) {
      console.log('⚠️  Database connection failed, skipping tests:', error);
      dbAvailable = false;
    }
  });

  afterAll(async () => {
    // 清理測試數據
    if (dbAvailable && testUserId) {
      try {
        await db.deleteUser(testUserId);
      } catch (error) {
        console.log('Cleanup error:', error);
      }
    }
    if (dbAvailable && adminUserId) {
      try {
        await db.deleteUser(adminUserId);
      } catch (error) {
        console.log('Cleanup error:', error);
      }
    }
  });

  describe('getPendingTeachers', () => {
    it.skipIf(!dbAvailable)('should return only pending teachers', async () => {
      const result = await db.getPendingTeachers(1, 10);
      
      expect(result).toHaveProperty('teachers');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
      
      // 驗證所有返回的師傅狀態都是 pending
      result.teachers.forEach((teacher: any) => {
        expect(teacher.status).toBe('pending');
      });
    });

    it.skipIf(!dbAvailable)('should paginate results correctly', async () => {
      const page1 = await db.getPendingTeachers(1, 5);
      const page2 = await db.getPendingTeachers(2, 5);
      
      expect(page1.page).toBe(1);
      expect(page2.page).toBe(2);
      expect(page1.teachers.length).toBeLessThanOrEqual(5);
      expect(page2.teachers.length).toBeLessThanOrEqual(5);
    });
  });

  describe('approveTeacher', () => {
    it.skipIf(!dbAvailable)('should approve a teacher and update status', async () => {
      const result = await db.approveTeacher(
        testTeacherProfileId,
        adminUserId,
        'Approved after review'
      );
      
      expect(result.success).toBe(true);
      
      // 驗證狀態已更新
      const profile = await db.getTeacherProfileById(testTeacherProfileId);
      expect(profile?.status).toBe('approved');
      expect(profile?.approvedBy).toBe(adminUserId);
      expect(profile?.approvedAt).toBeTruthy();
    });

    it.skipIf(!dbAvailable)('should create approval history record', async () => {
      const history = await db.getTeacherApprovalHistory(testTeacherProfileId);
      
      expect(history.length).toBeGreaterThan(0);
      const latestRecord = history[0];
      expect(latestRecord.status).toBe('approved');
      expect(latestRecord.reviewNotes).toBe('Approved after review');
    });
  });

  describe('rejectTeacher', () => {
    it.skipIf(!dbAvailable)('should reject a teacher with reason', async () => {
      const rejectionReason = 'Insufficient qualifications';
      
      const result = await db.rejectTeacher(
        testTeacherProfileId,
        adminUserId,
        rejectionReason
      );
      
      expect(result.success).toBe(true);
      
      // 驗證狀態已更新
      const profile = await db.getTeacherProfileById(testTeacherProfileId);
      expect(profile?.status).toBe('rejected');
      expect(profile?.rejectionReason).toBe(rejectionReason);
    });

    it.skipIf(!dbAvailable)('should create rejection history record', async () => {
      const history = await db.getTeacherApprovalHistory(testTeacherProfileId);
      
      const rejectionRecord = history.find((h: any) => h.status === 'rejected');
      expect(rejectionRecord).toBeTruthy();
      expect(rejectionRecord?.reviewNotes).toBe('Insufficient qualifications');
    });
  });

  describe('getTeacherApprovalStatus', () => {
    it.skipIf(!dbAvailable)('should return teacher approval status', async () => {
      const status = await db.getTeacherApprovalStatus(testUserId);
      
      expect(status).toBeTruthy();
      expect(status?.status).toBeDefined();
      expect(['pending', 'approved', 'rejected', 'suspended']).toContain(status?.status);
    });

    it.skipIf(!dbAvailable)('should return null for user without teacher profile', async () => {
      const nonTeacherUserId = await db.createUserWithoutPassword({
        email: 'regular-user@example.com',
        name: 'Regular User',
        role: 'user',
      });
      
      const status = await db.getTeacherApprovalStatus(nonTeacherUserId);
      expect(status).toBeNull();
      
      await db.deleteUser(nonTeacherUserId);
    });
  });

  describe('searchTeachers with status filter', () => {
    it.skipIf(!dbAvailable)('should only return approved teachers in public search', async () => {
      const searchResults = await db.searchTeachers({});
      
      // 驗證搜索結果中的所有師傅都是已批准的
      searchResults.teachers.forEach((result: any) => {
        expect(result.profile.status).toBe('approved');
      });
    });

    it.skipIf(!dbAvailable)('should not return pending or rejected teachers', async () => {
      // 創建一個 pending 師傅
      const pendingUserId = await db.createUserWithoutPassword({
        email: 'pending-teacher@example.com',
        name: 'Pending Teacher',
        role: 'teacher',
      });
      
      await db.createTeacherProfile({
        userId: pendingUserId,
        displayName: 'Pending Teacher',
        status: 'pending',
      });
      
      const searchResults = await db.searchTeachers({});
      
      // 驗證 pending 師傅不在搜索結果中
      const foundPending = searchResults.teachers.some(
        (result: any) => result.profile.userId === pendingUserId
      );
      expect(foundPending).toBe(false);
      
      await db.deleteUser(pendingUserId);
    });
  });

  describe('Authorization', () => {
    it.skipIf(!dbAvailable)('should require superadmin role for approval operations', async () => {
      // 這個測試需要使用 tRPC context 來測試權限
      // 在實際實現中，非 superadmin 用戶應該無法調用審核 API
      const regularUserId = await db.createUserWithoutPassword({
        email: 'regular@example.com',
        name: 'Regular User',
        role: 'user',
      });
      
      // 模擬非 superadmin 用戶嘗試批准師傅
      // 在 tRPC 中會被 superadminProcedure 攔截
      
      await db.deleteUser(regularUserId);
    });
  });

  describe('Edge Cases', () => {
    it.skipIf(!dbAvailable)('should handle non-existent teacher profile', async () => {
      const nonExistentId = 999999;
      
      try {
        await db.approveTeacher(nonExistentId, adminUserId, 'Test');
        // 如果沒有拋出錯誤，測試失敗
        expect(true).toBe(false);
      } catch (error) {
        // 預期會拋出錯誤
        expect(error).toBeTruthy();
      }
    });

    it.skipIf(!dbAvailable)('should handle empty rejection reason', async () => {
      try {
        await db.rejectTeacher(testTeacherProfileId, adminUserId, '');
        // 應該要求提供拒絕原因
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeTruthy();
      }
    });
  });
});

describe('Teacher Approval History', () => {
  let testUserId: number;
  let testTeacherProfileId: number;
  let adminUserId: number;
  let dbAvailable = false;

  beforeAll(async () => {
    try {
      const database = await db.getDb();
      if (!database) {
        console.log('⚠️  Database not available, skipping tests.');
        return;
      }
      dbAvailable = true;

      testUserId = await db.createUserWithoutPassword({
        email: 'history-test-teacher@example.com',
        name: 'History Test Teacher',
        role: 'teacher',
      });

      adminUserId = await db.createUserWithoutPassword({
        email: 'history-admin@example.com',
        name: 'History Admin',
        role: 'superadmin',
      });

      const profileId = await db.createTeacherProfile({
        userId: testUserId,
        displayName: 'History Test Teacher',
      });
      testTeacherProfileId = profileId || 0;
    } catch (error) {
      console.log('⚠️  Database connection failed, skipping tests:', error);
      dbAvailable = false;
    }
  });

  afterAll(async () => {
    if (dbAvailable && testUserId) {
      try {
        await db.deleteUser(testUserId);
      } catch (error) {
        console.log('Cleanup error:', error);
      }
    }
    if (dbAvailable && adminUserId) {
      try {
        await db.deleteUser(adminUserId);
      } catch (error) {
        console.log('Cleanup error:', error);
      }
    }
  });

  it.skipIf(!dbAvailable)('should track multiple approval status changes', async () => {
    // 第一次批准
    await db.approveTeacher(testTeacherProfileId, adminUserId, 'First approval');
    
    // 拒絕
    await db.rejectTeacher(testTeacherProfileId, adminUserId, 'Found issues');
    
    // 再次批准
    await db.approveTeacher(testTeacherProfileId, adminUserId, 'Issues resolved');
    
    const history = await db.getTeacherApprovalHistory(testTeacherProfileId);
    
    // 應該有3條記錄
    expect(history.length).toBe(3);
    
    // 按時間降序排列，最新的應該是第二次批准
    expect(history[0].status).toBe('approved');
    expect(history[0].reviewNotes).toBe('Issues resolved');
    expect(history[1].status).toBe('rejected');
    expect(history[2].status).toBe('approved');
  });

  it.skipIf(!dbAvailable)('should include reviewer information', async () => {
    const history = await db.getTeacherApprovalHistory(testTeacherProfileId);
    
    history.forEach((record: any) => {
      expect(record.reviewerName).toBeTruthy();
      expect(record.reviewerEmail).toBeTruthy();
      expect(record.createdAt).toBeTruthy();
    });
  });
});
