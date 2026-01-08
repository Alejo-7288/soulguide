import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(role: "user" | "teacher" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
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
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Bookings Router", () => {
  it("should have create booking procedure", () => {
    expect(appRouter.bookings.create).toBeDefined();
  });

  it("should have getById procedure", () => {
    expect(appRouter.bookings.getById).toBeDefined();
  });

  it("should have cancel procedure", () => {
    expect(appRouter.bookings.cancel).toBeDefined();
  });

  it("should have createCheckoutSession procedure", () => {
    expect(appRouter.bookings.createCheckoutSession).toBeDefined();
  });
});

describe("Categories Router", () => {
  it("should have list procedure", () => {
    expect(appRouter.categories.list).toBeDefined();
  });

  it("should have getBySlug procedure", () => {
    expect(appRouter.categories.getBySlug).toBeDefined();
  });
});

describe("Teachers Router", () => {
  it("should have search procedure", () => {
    expect(appRouter.teachers.search).toBeDefined();
  });

  it("should have featured procedure", () => {
    expect(appRouter.teachers.featured).toBeDefined();
  });

  it("should have topRated procedure", () => {
    expect(appRouter.teachers.topRated).toBeDefined();
  });

  it("should have getById procedure", () => {
    expect(appRouter.teachers.getById).toBeDefined();
  });

  it("should have getReviews procedure", () => {
    expect(appRouter.teachers.getReviews).toBeDefined();
  });
});

describe("Notifications Router", () => {
  it("should have list procedure", () => {
    expect(appRouter.notifications.list).toBeDefined();
  });

  it("should have unreadCount procedure", () => {
    expect(appRouter.notifications.unreadCount).toBeDefined();
  });

  it("should have markRead procedure", () => {
    expect(appRouter.notifications.markRead).toBeDefined();
  });

  it("should have markAllRead procedure", () => {
    expect(appRouter.notifications.markAllRead).toBeDefined();
  });
});

describe("User Dashboard Router", () => {
  it("should have getBookings procedure", () => {
    expect(appRouter.userDashboard.getBookings).toBeDefined();
  });

  it("should have getFavorites procedure", () => {
    expect(appRouter.userDashboard.getFavorites).toBeDefined();
  });

  it("should have toggleFavorite procedure", () => {
    expect(appRouter.userDashboard.toggleFavorite).toBeDefined();
  });
});

describe("Teacher Dashboard Router", () => {
  it("should have getProfile procedure", () => {
    expect(appRouter.teacherDashboard.getProfile).toBeDefined();
  });

  it("should have createProfile procedure", () => {
    expect(appRouter.teacherDashboard.createProfile).toBeDefined();
  });

  it("should have updateProfile procedure", () => {
    expect(appRouter.teacherDashboard.updateProfile).toBeDefined();
  });

  it("should have getServices procedure", () => {
    expect(appRouter.teacherDashboard.getServices).toBeDefined();
  });

  it("should have getAvailability procedure", () => {
    expect(appRouter.teacherDashboard.getAvailability).toBeDefined();
  });

  it("should have getBookings procedure", () => {
    expect(appRouter.teacherDashboard.getBookings).toBeDefined();
  });
});

describe("Reviews Router", () => {
  it("should have create procedure", () => {
    expect(appRouter.reviews.create).toBeDefined();
  });
});
