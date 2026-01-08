import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import bcrypt from "bcryptjs";

// Mock db functions
vi.mock("./db", () => ({
  getUserByEmail: vi.fn(),
  createUserWithEmail: vi.fn(),
  getUserById: vi.fn(),
  updateUserLastSignedIn: vi.fn(),
  updateUserProfile: vi.fn(),
}));

// Mock sdk
vi.mock("./_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn().mockResolvedValue("mock-session-token"),
  },
}));

import * as db from "./db";
import { sdk } from "./_core/sdk";

type CookieCall = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

function createPublicContext(): { ctx: TrpcContext; setCookies: CookieCall[] } {
  const setCookies: CookieCall[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, value, options });
      },
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx, setCookies };
}

function createAuthContext(user: any): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("auth.register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register a new user with email and password", async () => {
    const { ctx, setCookies } = createPublicContext();
    
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined);
    vi.mocked(db.createUserWithEmail).mockResolvedValue(1);
    vi.mocked(db.getUserById).mockResolvedValue({
      id: 1,
      openId: "email_123_abc",
      name: "Test User",
      email: "test@example.com",
      passwordHash: "hashed",
      loginMethod: "email",
      role: "user",
      avatarUrl: null,
      phone: "+852 91234567",
      instagram: "testuser",
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.register({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
      phone: "+852 91234567",
      instagram: "testuser",
    });

    expect(result.success).toBe(true);
    expect(result.user.email).toBe("test@example.com");
    expect(db.getUserByEmail).toHaveBeenCalledWith("test@example.com");
    expect(db.createUserWithEmail).toHaveBeenCalled();
    expect(setCookies.length).toBe(1);
  });

  it("should reject registration if email already exists", async () => {
    const { ctx } = createPublicContext();
    
    vi.mocked(db.getUserByEmail).mockResolvedValue({
      id: 1,
      openId: "existing_user",
      name: "Existing User",
      email: "test@example.com",
      passwordHash: "hashed",
      loginMethod: "email",
      role: "user",
      avatarUrl: null,
      phone: null,
      instagram: null,
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.auth.register({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    })).rejects.toThrow("該電郵地址已被註冊");
  });

  it("should reject registration with short password", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.auth.register({
      email: "test@example.com",
      password: "short",
      name: "Test User",
    })).rejects.toThrow();
  });
});

describe("auth.login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should login with correct email and password", async () => {
    const { ctx, setCookies } = createPublicContext();
    const hashedPassword = await bcrypt.hash("password123", 12);
    
    vi.mocked(db.getUserByEmail).mockResolvedValue({
      id: 1,
      openId: "email_123_abc",
      name: "Test User",
      email: "test@example.com",
      passwordHash: hashedPassword,
      loginMethod: "email",
      role: "user",
      avatarUrl: null,
      phone: null,
      instagram: null,
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.login({
      email: "test@example.com",
      password: "password123",
    });

    expect(result.success).toBe(true);
    expect(result.user.email).toBe("test@example.com");
    expect(db.updateUserLastSignedIn).toHaveBeenCalledWith(1);
    expect(setCookies.length).toBe(1);
  });

  it("should reject login with wrong password", async () => {
    const { ctx } = createPublicContext();
    const hashedPassword = await bcrypt.hash("password123", 12);
    
    vi.mocked(db.getUserByEmail).mockResolvedValue({
      id: 1,
      openId: "email_123_abc",
      name: "Test User",
      email: "test@example.com",
      passwordHash: hashedPassword,
      loginMethod: "email",
      role: "user",
      avatarUrl: null,
      phone: null,
      instagram: null,
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.auth.login({
      email: "test@example.com",
      password: "wrongpassword",
    })).rejects.toThrow("電郵或密碼錯誤");
  });

  it("should reject login for non-existent user", async () => {
    const { ctx } = createPublicContext();
    
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.auth.login({
      email: "nonexistent@example.com",
      password: "password123",
    })).rejects.toThrow("電郵或密碼錯誤");
  });

  it("should reject login for OAuth user without password", async () => {
    const { ctx } = createPublicContext();
    
    vi.mocked(db.getUserByEmail).mockResolvedValue({
      id: 1,
      openId: "manus_user",
      name: "Manus User",
      email: "test@example.com",
      passwordHash: null, // OAuth user has no password
      loginMethod: "manus",
      role: "user",
      avatarUrl: null,
      phone: null,
      instagram: null,
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.auth.login({
      email: "test@example.com",
      password: "password123",
    })).rejects.toThrow("該帳戶使用其他登入方式");
  });
});

describe("auth.updateProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update user profile", async () => {
    const user = {
      id: 1,
      openId: "email_123_abc",
      name: "Test User",
      email: "test@example.com",
      passwordHash: "hashed",
      loginMethod: "email",
      role: "user" as const,
      avatarUrl: null,
      phone: null,
      instagram: null,
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    
    const { ctx } = createAuthContext(user);
    vi.mocked(db.updateUserProfile).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.updateProfile({
      name: "Updated Name",
      phone: "+852 98765432",
      instagram: "newhandle",
    });

    expect(result.success).toBe(true);
    expect(db.updateUserProfile).toHaveBeenCalledWith(1, {
      name: "Updated Name",
      phone: "+852 98765432",
      instagram: "newhandle",
    });
  });
});
