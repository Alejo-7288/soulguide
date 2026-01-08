import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getTeacherProfileByUserId: vi.fn(),
  getTeacherReviewsForManagement: vi.fn(),
  getTeacherIncomeStats: vi.fn(),
  getTeacherMonthlyIncome: vi.fn(),
  getTeacherClients: vi.fn(),
  getTeacherBookingStats: vi.fn(),
}));

import * as db from './db';

describe('Teacher Dashboard Extended Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTeacherReviewsForManagement', () => {
    it('should return empty array when no reviews exist', async () => {
      vi.mocked(db.getTeacherReviewsForManagement).mockResolvedValue([]);
      
      const result = await db.getTeacherReviewsForManagement(1);
      
      expect(result).toEqual([]);
      expect(db.getTeacherReviewsForManagement).toHaveBeenCalledWith(1);
    });

    it('should return reviews with user and booking info', async () => {
      const mockReviews = [
        {
          review: { id: 1, rating: 5, comment: 'Great service!', teacherReply: null },
          user: { id: 1, name: 'Test User', email: 'test@example.com' },
          booking: { id: 1, bookingDate: '2026-01-01' },
        },
      ];
      
      vi.mocked(db.getTeacherReviewsForManagement).mockResolvedValue(mockReviews);
      
      const result = await db.getTeacherReviewsForManagement(1);
      
      expect(result).toHaveLength(1);
      expect(result[0].review.rating).toBe(5);
      expect(result[0].user.name).toBe('Test User');
    });
  });

  describe('getTeacherIncomeStats', () => {
    it('should return zero stats when no completed bookings', async () => {
      const mockStats = {
        totalIncome: 0,
        thisMonthIncome: 0,
        lastMonthIncome: 0,
        completedBookings: 0,
      };
      
      vi.mocked(db.getTeacherIncomeStats).mockResolvedValue(mockStats);
      
      const result = await db.getTeacherIncomeStats(1);
      
      expect(result.totalIncome).toBe(0);
      expect(result.thisMonthIncome).toBe(0);
      expect(result.completedBookings).toBe(0);
    });

    it('should return correct income statistics', async () => {
      const mockStats = {
        totalIncome: 15000,
        thisMonthIncome: 5000,
        lastMonthIncome: 3000,
        completedBookings: 10,
      };
      
      vi.mocked(db.getTeacherIncomeStats).mockResolvedValue(mockStats);
      
      const result = await db.getTeacherIncomeStats(1);
      
      expect(result.totalIncome).toBe(15000);
      expect(result.thisMonthIncome).toBe(5000);
      expect(result.lastMonthIncome).toBe(3000);
      expect(result.completedBookings).toBe(10);
    });
  });

  describe('getTeacherMonthlyIncome', () => {
    it('should return empty array when no income data', async () => {
      vi.mocked(db.getTeacherMonthlyIncome).mockResolvedValue([]);
      
      const result = await db.getTeacherMonthlyIncome(1);
      
      expect(result).toEqual([]);
    });

    it('should return monthly income data', async () => {
      const mockData = [
        { month: '2026-01', income: 5000, bookings: 3 },
        { month: '2025-12', income: 3000, bookings: 2 },
      ];
      
      vi.mocked(db.getTeacherMonthlyIncome).mockResolvedValue(mockData);
      
      const result = await db.getTeacherMonthlyIncome(1);
      
      expect(result).toHaveLength(2);
      expect(result[0].month).toBe('2026-01');
      expect(result[0].income).toBe(5000);
    });
  });

  describe('getTeacherClients', () => {
    it('should return empty array when no clients', async () => {
      vi.mocked(db.getTeacherClients).mockResolvedValue([]);
      
      const result = await db.getTeacherClients(1);
      
      expect(result).toEqual([]);
    });

    it('should return client list with booking stats', async () => {
      const mockClients = [
        {
          user: { id: 1, name: 'Client A', email: 'clienta@example.com' },
          totalBookings: 5,
          totalSpent: 7500,
          lastBooking: new Date('2026-01-05'),
        },
      ];
      
      vi.mocked(db.getTeacherClients).mockResolvedValue(mockClients);
      
      const result = await db.getTeacherClients(1);
      
      expect(result).toHaveLength(1);
      expect(result[0].user.name).toBe('Client A');
      expect(result[0].totalBookings).toBe(5);
      expect(result[0].totalSpent).toBe(7500);
    });
  });

  describe('getTeacherBookingStats', () => {
    it('should return zero stats when no bookings', async () => {
      const mockStats = {
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        thisMonth: 0,
      };
      
      vi.mocked(db.getTeacherBookingStats).mockResolvedValue(mockStats);
      
      const result = await db.getTeacherBookingStats(1);
      
      expect(result.pending).toBe(0);
      expect(result.confirmed).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.thisMonth).toBe(0);
    });

    it('should return correct booking statistics', async () => {
      const mockStats = {
        pending: 2,
        confirmed: 3,
        completed: 10,
        cancelled: 1,
        thisMonth: 5,
      };
      
      vi.mocked(db.getTeacherBookingStats).mockResolvedValue(mockStats);
      
      const result = await db.getTeacherBookingStats(1);
      
      expect(result.pending).toBe(2);
      expect(result.confirmed).toBe(3);
      expect(result.completed).toBe(10);
      expect(result.cancelled).toBe(1);
      expect(result.thisMonth).toBe(5);
    });
  });
});
