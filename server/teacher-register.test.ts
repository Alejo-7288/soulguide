import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "teacher" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 999, // Use a unique ID that won't have existing data
    openId: "test-user-unique-999",
    email: "test-unique@example.com",
    name: "Test User",
    loginMethod: "email",
    role,
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
      clearCookie: () => {},
    } as TrpcContext["res"],
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
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Teacher Registration", () => {
  describe("categories.list", () => {
    it("returns list of categories for public access", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.categories.list();

      expect(Array.isArray(result)).toBe(true);
      // Categories should have id, name, and slug
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("id");
        expect(result[0]).toHaveProperty("name");
        expect(result[0]).toHaveProperty("slug");
      }
    });
  });

  describe("teacherDashboard.getProfile", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.teacherDashboard.getProfile()).rejects.toThrow();
    });

    it("requires teacher role to access profile", async () => {
      const ctx = createAuthContext("user");
      const caller = appRouter.createCaller(ctx);

      // Regular user should get FORBIDDEN error
      await expect(caller.teacherDashboard.getProfile()).rejects.toThrow("需要老師權限");
    });

    it("allows teacher role to access profile", async () => {
      const ctx = createAuthContext("teacher");
      const caller = appRouter.createCaller(ctx);

      // Teacher role should be able to call the endpoint (may return null if no profile)
      const result = await caller.teacherDashboard.getProfile();
      // Result can be null/undefined for teacher without profile data
      expect(result === null || result === undefined || typeof result === "object").toBe(true);
    });
  });

  describe("teacherDashboard.createProfile", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.teacherDashboard.createProfile({
          displayName: "Test Teacher",
          categoryIds: [1],
        })
      ).rejects.toThrow();
    });

    it("validates required displayName field", async () => {
      const ctx = createAuthContext("user");
      const caller = appRouter.createCaller(ctx);

      // Empty displayName should fail validation (Zod validation)
      await expect(
        caller.teacherDashboard.createProfile({
          displayName: "",
          categoryIds: [1],
        })
      ).rejects.toThrow();
    });

    it("creates profile with valid data", async () => {
      const ctx = createAuthContext("user");
      ctx.user!.id = Math.floor(Math.random() * 100000) + 10000; // Unique ID within valid range
      const caller = appRouter.createCaller(ctx);

      const result = await caller.teacherDashboard.createProfile({
        displayName: "New Test Teacher",
        categoryIds: [1, 2],
        title: "Test Expert",
        bio: "Test bio",
      });

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("profileId");
    });
  });
});
