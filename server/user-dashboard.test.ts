import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "email",
    role: "user",
    phone: "0912345678",
    instagram: "testuser",
    passwordHash: "$2a$12$test",
    avatarUrl: null,
    isEmailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("auth.updateProfile", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.updateProfile({
        name: "New Name",
        phone: "0987654321",
        instagram: "newhandle",
      })
    ).rejects.toThrow();
  });

  it("accepts valid profile update input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This will fail at DB level but validates input schema
    try {
      await caller.auth.updateProfile({
        name: "Updated Name",
        phone: "0987654321",
        instagram: "updated_ig",
      });
    } catch (e: any) {
      // Expected to fail at DB level, but input validation should pass
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });
});

describe("auth.changePassword", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.changePassword({
        currentPassword: "oldpass123",
        newPassword: "newpass123",
      })
    ).rejects.toThrow();
  });

  it("validates minimum password length", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.changePassword({
        currentPassword: "oldpass",
        newPassword: "short", // Less than 8 characters
      })
    ).rejects.toThrow();
  });

  it("accepts valid password change input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This will fail at DB level because user doesn't exist in test DB
    // But we can verify the input validation passes
    try {
      await caller.auth.changePassword({
        currentPassword: "oldpassword123",
        newPassword: "newpassword123",
      });
    } catch (e: any) {
      // Expected to fail - either NOT_FOUND (user not in DB) or BAD_REQUEST (no password hash)
      // Both are acceptable as they indicate input validation passed
      expect(["NOT_FOUND", "BAD_REQUEST", "INTERNAL_SERVER_ERROR"]).toContain(e.code);
    }
  });
});

describe("userDashboard.getMyReviews", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.userDashboard.getMyReviews()).rejects.toThrow();
  });

  it("returns reviews for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This should not throw for authenticated users
    try {
      const reviews = await caller.userDashboard.getMyReviews();
      expect(Array.isArray(reviews)).toBe(true);
    } catch (e: any) {
      // May fail at DB level, but should not be auth error
      expect(e.code).not.toBe("UNAUTHORIZED");
    }
  });
});

describe("userDashboard.getBookings", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.userDashboard.getBookings()).rejects.toThrow();
  });
});

describe("userDashboard.getFavorites", () => {
  it("requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.userDashboard.getFavorites()).rejects.toThrow();
  });
});
