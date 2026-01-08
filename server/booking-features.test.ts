import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module
vi.mock("./db", () => ({
  getServiceById: vi.fn(),
  checkBookingConflict: vi.fn(),
  createBooking: vi.fn(),
  getBookingById: vi.fn(),
  rescheduleBooking: vi.fn(),
  getTeacherProfileById: vi.fn(),
  createNotification: vi.fn(),
  getBookedSlots: vi.fn(),
}));

import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: { origin: "http://localhost:3000" },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Booking Features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("bookings.checkAvailability", () => {
    it("returns available: true when no conflict exists", async () => {
      vi.mocked(db.checkBookingConflict).mockResolvedValue(false);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bookings.checkAvailability({
        teacherProfileId: 1,
        date: "2026-01-15",
        startTime: "10:00",
        endTime: "11:00",
      });

      expect(result.available).toBe(true);
      expect(db.checkBookingConflict).toHaveBeenCalledWith(
        1,
        expect.any(Date),
        "10:00",
        "11:00"
      );
    });

    it("returns available: false when conflict exists", async () => {
      vi.mocked(db.checkBookingConflict).mockResolvedValue(true);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bookings.checkAvailability({
        teacherProfileId: 1,
        date: "2026-01-15",
        startTime: "10:00",
        endTime: "11:00",
      });

      expect(result.available).toBe(false);
    });
  });

  describe("bookings.getBookedSlots", () => {
    it("returns booked slots for a date", async () => {
      const mockSlots = [
        { startTime: "09:00", endTime: "10:00" },
        { startTime: "14:00", endTime: "15:00" },
      ];
      vi.mocked(db.getBookedSlots).mockResolvedValue(mockSlots);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bookings.getBookedSlots({
        teacherProfileId: 1,
        date: "2026-01-15",
      });

      expect(result).toEqual(mockSlots);
      expect(db.getBookedSlots).toHaveBeenCalledWith(1, expect.any(Date));
    });
  });

  describe("bookings.create with conflict detection", () => {
    it("throws error when time slot is already booked", async () => {
      vi.mocked(db.getServiceById).mockResolvedValue({
        id: 1,
        teacherProfileId: 1,
        categoryId: 1,
        name: "Test Service",
        description: null,
        serviceType: "reading",
        duration: 60,
        price: "100.00",
        currency: "HKD",
        isOnline: true,
        isInPerson: true,
        maxParticipants: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(db.checkBookingConflict).mockResolvedValue(true);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.bookings.create({
          teacherProfileId: 1,
          serviceId: 1,
          bookingDate: "2026-01-15",
          startTime: "10:00",
          endTime: "11:00",
          isOnline: false,
        })
      ).rejects.toThrow("該時段已被預約，請選擇其他時間");
    });

    it("creates booking when no conflict exists", async () => {
      vi.mocked(db.getServiceById).mockResolvedValue({
        id: 1,
        teacherProfileId: 1,
        categoryId: 1,
        name: "Test Service",
        description: null,
        serviceType: "reading",
        duration: 60,
        price: "100.00",
        currency: "HKD",
        isOnline: true,
        isInPerson: true,
        maxParticipants: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(db.checkBookingConflict).mockResolvedValue(false);
      vi.mocked(db.createBooking).mockResolvedValue(123);
      vi.mocked(db.getTeacherProfileById).mockResolvedValue({
        id: 1,
        userId: 2,
        displayName: "Test Teacher",
        title: null,
        bio: null,
        experience: null,
        qualifications: null,
        avatarUrl: null,
        coverImageUrl: null,
        region: null,
        address: null,
        latitude: null,
        longitude: null,
        contactEmail: null,
        contactPhone: null,
        website: null,
        totalBookings: 0,
        totalReviews: 0,
        averageRating: "0.00",
        isVerified: false,
        isActive: true,
        isFeatured: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(db.createNotification).mockResolvedValue(1);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bookings.create({
        teacherProfileId: 1,
        serviceId: 1,
        bookingDate: "2026-01-15",
        startTime: "10:00",
        endTime: "11:00",
        isOnline: false,
      });

      expect(result.success).toBe(true);
      expect(result.bookingId).toBe(123);
    });
  });

  describe("bookings.reschedule", () => {
    it("throws error when rescheduling to a conflicting time", async () => {
      vi.mocked(db.getBookingById).mockResolvedValue({
        id: 1,
        userId: 1,
        teacherProfileId: 1,
        serviceId: 1,
        bookingDate: new Date("2026-01-15"),
        startTime: "10:00",
        endTime: "11:00",
        status: "pending",
        paymentStatus: "pending",
        totalAmount: "100.00",
        currency: "HKD",
        notes: null,
        userPhone: null,
        userEmail: null,
        isOnline: false,
        stripePaymentIntentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(db.checkBookingConflict).mockResolvedValue(true);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.bookings.reschedule({
          bookingId: 1,
          newDate: "2026-01-16",
          newStartTime: "14:00",
          newEndTime: "15:00",
        })
      ).rejects.toThrow("該時段已被預約，請選擇其他時間");
    });

    it("reschedules booking when no conflict exists", async () => {
      vi.mocked(db.getBookingById).mockResolvedValue({
        id: 1,
        userId: 1,
        teacherProfileId: 1,
        serviceId: 1,
        bookingDate: new Date("2026-01-15"),
        startTime: "10:00",
        endTime: "11:00",
        status: "confirmed",
        paymentStatus: "pending",
        totalAmount: "100.00",
        currency: "HKD",
        notes: null,
        userPhone: null,
        userEmail: null,
        isOnline: false,
        stripePaymentIntentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(db.checkBookingConflict).mockResolvedValue(false);
      vi.mocked(db.rescheduleBooking).mockResolvedValue(undefined);
      vi.mocked(db.getTeacherProfileById).mockResolvedValue({
        id: 1,
        userId: 2,
        displayName: "Test Teacher",
        title: null,
        bio: null,
        experience: null,
        qualifications: null,
        avatarUrl: null,
        coverImageUrl: null,
        region: null,
        address: null,
        latitude: null,
        longitude: null,
        contactEmail: null,
        contactPhone: null,
        website: null,
        totalBookings: 0,
        totalReviews: 0,
        averageRating: "0.00",
        isVerified: false,
        isActive: true,
        isFeatured: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(db.createNotification).mockResolvedValue(1);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.bookings.reschedule({
        bookingId: 1,
        newDate: "2026-01-16",
        newStartTime: "14:00",
        newEndTime: "15:00",
      });

      expect(result.success).toBe(true);
      expect(db.rescheduleBooking).toHaveBeenCalledWith(
        1,
        expect.any(Date),
        "14:00",
        "15:00"
      );
    });
  });
});
