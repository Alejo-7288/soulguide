import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { appRouter } from './routers';

describe('Superadmin API', () => {
  let superadminId: number;
  let testUserId: number;
  let db: any;
  let caller: any;

  beforeAll(async () => {
    db = await getDb();
    
    // Create a superadmin user
    const superadminResult = await db.insert(users).values({
      openId: `test_superadmin_${Date.now()}`,
      email: `superadmin_${Date.now()}@test.com`,
      name: 'Test Superadmin',
      role: 'superadmin',
      loginMethod: 'email',
    });
    superadminId = superadminResult[0]?.insertId || 1;

    // Create a regular user
    const userResult = await db.insert(users).values({
      openId: `test_user_${Date.now()}`,
      email: `user_${Date.now()}@test.com`,
      name: 'Test User',
      role: 'user',
      loginMethod: 'email',
    });
    testUserId = userResult[0]?.insertId || 2;

    // Create TRPC caller with superadmin context
    caller = appRouter.createCaller({
      user: {
        id: superadminId,
        openId: `test_superadmin_${Date.now()}`,
        email: `superadmin_${Date.now()}@test.com`,
        name: 'Test Superadmin',
        role: 'superadmin',
        loginMethod: 'email',
      },
      req: {} as any,
      res: {} as any,
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (db) {
      const allUsers = await db.select().from(users);
      for (const user of allUsers) {
        if (user.role === 'superadmin' || user.role === 'user') {
          await db.delete(users).where(eq(users.id, user.id));
        }
      }
    }
  });

  it('should get analytics data', async () => {
    const result = await caller.superadmin.getAnalytics();
    expect(result).toBeDefined();
    expect(result).toHaveProperty('totalUsers');
    expect(result).toHaveProperty('totalTeachers');
    expect(result).toHaveProperty('totalBookings');
    expect(result).toHaveProperty('totalReviews');
    expect(typeof result.totalUsers).toBe('number');
    expect(typeof result.totalTeachers).toBe('number');
  });

  it('should get all users with pagination', async () => {
    const result = await caller.superadmin.getAllUsers({
      page: 1,
      limit: 20,
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty('users');
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.users)).toBe(true);
    expect(typeof result.total).toBe('number');
  });

  it('should export users', async () => {
    const result = await caller.superadmin.exportUsers();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should get all teachers with pagination', async () => {
    const result = await caller.superadmin.getAllTeachers({
      page: 1,
      limit: 20,
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty('teachers');
    expect(result).toHaveProperty('total');
    expect(Array.isArray(result.teachers)).toBe(true);
    expect(typeof result.total).toBe('number');
  });

  it('should export teachers', async () => {
    const result = await caller.superadmin.exportTeachers();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should create a new user', async () => {
    const result = await caller.superadmin.createUser({
      email: `newuser_${Date.now()}@test.com`,
      name: 'New Test User',
      role: 'user',
      phone: '+852 1234 5678',
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(typeof result.userId).toBe('number');
  });

  it('should delete a user', async () => {
    // First create a user to delete
    const createResult = await caller.superadmin.createUser({
      email: `deleteuser_${Date.now()}@test.com`,
      name: 'Delete Test User',
      role: 'user',
    });

    // Then delete it
    const deleteResult = await caller.superadmin.deleteUser({
      userId: createResult.userId,
    });

    expect(deleteResult.success).toBe(true);
  });
});
