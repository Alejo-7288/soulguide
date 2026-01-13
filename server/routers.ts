import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import bcrypt from "bcryptjs";
import { sdk } from "./_core/sdk";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'superadmin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '需要管理員權限' });
  }
  return next({ ctx });
});

// SuperAdmin-only procedure
const superadminProcedure = protectedProcedure.use(({ ctx, next }) => {
  console.log('[SuperAdmin Check] User role:', ctx.user?.role, 'Email:', ctx.user?.email);
  if (ctx.user.role !== 'superadmin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '需要超級管理員權限' });
  }
  return next({ ctx });
});

// Teacher-only procedure
const teacherProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'teacher' && ctx.user.role !== 'admin' && ctx.user.role !== 'superadmin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '需要老師權限' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    
    // Email/Password Registration
    register: publicProcedure
      .input(z.object({
        email: z.string().email("請輸入有效的電郵地址"),
        password: z.string().min(8, "密碼至少需要8個字元"),
        name: z.string().min(1, "請輸入姓名"),
        phone: z.string().optional(),
        instagram: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if email already exists
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({ code: 'CONFLICT', message: '該電郵地址已被註冊' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(input.password, 12);
        
        // Create user
        const userId = await db.createUserWithEmail({
          email: input.email,
          passwordHash,
          name: input.name,
          phone: input.phone,
          instagram: input.instagram,
        });
        
        // Get the created user
        const user = await db.getUserById(userId);
        if (!user) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '建立用戶失敗' });
        }
        
        // Create session token
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || '' });
        
        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });
        
        return { success: true, user: { id: user.id, name: user.name, email: user.email } };
      }),
    
    // Email/Password Login
    login: publicProcedure
      .input(z.object({
        email: z.string().email("請輸入有效的電郵地址"),
        password: z.string().min(1, "請輸入密碼"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Find user by email
        const user = await db.getUserByEmail(input.email);
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '電郵或密碼錯誤' });
        }
        
        // Check if user has password (email login method)
        if (!user.passwordHash) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '該帳戶使用其他登入方式，請使用 Manus 登入' });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
        if (!isValidPassword) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '電郵或密碼錯誤' });
        }
        
        // Update last signed in
        await db.updateUserLastSignedIn(user.id);
        
        // Create session token
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || '' });
        
        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });
        
        return { success: true, user: { id: user.id, name: user.name, email: user.email } };
      }),
    
    // Update user profile
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        instagram: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
    
    // Change password (for email login users only)
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1, "請輸入現有密碼"),
        newPassword: z.string().min(8, "新密碼至少需要8個字元"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get user with password
        const user = await db.getUserById(ctx.user.id);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '用戶不存在' });
        }
        
        // Check if user has password (email login)
        if (!user.passwordHash) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: '此帳戶不支援密碼修改' });
        }
        
        // Verify current password
        const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!isValid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '現有密碼不正確' });
        }
        
        // Hash new password and update
        const newPasswordHash = await bcrypt.hash(input.newPassword, 12);
        await db.updateUserPassword(ctx.user.id, newPasswordHash);
        
        return { success: true };
      }),
  }),

  // ============ CATEGORIES ============
  categories: router({
    list: publicProcedure.query(async () => {
      return db.getAllCategories();
    }),
    
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return db.getCategoryBySlug(input.slug);
      }),
    
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        iconUrl: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createCategory(input);
        return { success: true };
      }),
  }),

  // ============ TEACHERS ============
  teachers: router({
    search: publicProcedure
      .input(z.object({
        categoryId: z.number().optional(),
        region: z.string().optional(),
        query: z.string().optional(),
        sortBy: z.enum(["rating", "bookings", "newest"]).optional(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
      }))
      .query(async ({ input }) => {
        return db.searchTeachers(input);
      }),
    
    featured: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(20).optional() }).optional())
      .query(async ({ input }) => {
        return db.getFeaturedTeachers(input?.limit ?? 6);
      }),
    
    topRated: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(20).optional() }).optional())
      .query(async ({ input }) => {
        return db.getTopRatedTeachers(input?.limit ?? 10);
      }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const profile = await db.getTeacherProfileById(input.id);
        if (!profile) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '找不到該老師' });
        }
        
        const user = await db.getUserById(profile.userId);
        const categoriesData = await db.getTeacherCategories(input.id);
        const servicesData = await db.getServicesByTeacher(input.id);
        const availabilityData = await db.getTeacherAvailability(input.id);
        
        return {
          profile,
          user,
          categories: categoriesData.map(c => c.category),
          services: servicesData,
          availability: availabilityData,
        };
      }),
    
    getAvailability: publicProcedure
      .input(z.object({ teacherProfileId: z.number() }))
      .query(async ({ input }) => {
        return db.getTeacherAvailability(input.teacherProfileId);
      }),
    
    getReviews: publicProcedure
      .input(z.object({
        teacherProfileId: z.number(),
        limit: z.number().min(1).max(50).optional(),
        offset: z.number().min(0).optional(),
      }))
      .query(async ({ input }) => {
        return db.getReviewsByTeacher(input.teacherProfileId, input.limit ?? 20, input.offset ?? 0);
      }),
    
    regions: publicProcedure.query(async () => {
      return db.getDistinctRegions();
    }),
    
    uploadVerification: protectedProcedure
      .input(z.object({
        verificationTypeId: z.number(),
        fileUrl: z.string().url(),
        fileName: z.string(),
        fileSize: z.number(),
        fileType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.id) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '未授權' });
        }
        const teacherProfile = await db.getTeacherProfileByUserId(ctx.user.id);
        if (!teacherProfile) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '老師檔案未找到' });
        }
        return db.uploadTeacherVerification({
          teacherProfileId: teacherProfile.id,
          verificationTypeId: input.verificationTypeId,
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          fileSize: input.fileSize,
          fileType: input.fileType,
        });
      }),
    
    getMyVerifications: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user?.id) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '未授權' });
        }
        const teacherProfile = await db.getTeacherProfileByUserId(ctx.user.id);
        if (!teacherProfile) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '老師檔案未找到' });
        }
        return db.getTeacherVerifications(teacherProfile.id);
      }),
    
    deleteVerification: protectedProcedure
      .input(z.object({
        verificationId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.id) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '未授權' });
        }
        const verification = await db.getVerificationDetail(input.verificationId);
        if (!verification) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '認證未找到' });
        }
        const teacherProfile = await db.getTeacherProfileByUserId(ctx.user.id);
        if (!teacherProfile || teacherProfile.id !== verification.teacherProfileId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '無權刪除此認證' });
        }
        return db.deleteVerification(input.verificationId);
      }),
    
    getVerificationTypes: publicProcedure
      .query(async () => {
        return db.getVerificationTypes();
      })
  }),

  // ============ TEACHER DASHBOARD ============
  teacherDashboard: router({
    getProfile: teacherProcedure.query(async ({ ctx }) => {
      const profile = await db.getTeacherProfileByUserId(ctx.user.id);
      if (!profile) {
        return null;
      }
      const categoriesData = await db.getTeacherCategories(profile.id);
      return {
        profile,
        categories: categoriesData.map(c => c.category),
      };
    }),
    
    createProfile: protectedProcedure
      .input(z.object({
        displayName: z.string().min(1),
        title: z.string().optional(),
        bio: z.string().optional(),
        experience: z.string().optional(),
        qualifications: z.string().optional(),
        region: z.string().optional(),
        address: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        categoryIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if already has profile
        const existing = await db.getTeacherProfileByUserId(ctx.user.id);
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: '您已經有老師資料' });
        }
        
        const { categoryIds, ...profileData } = input;
        const profileId = await db.createTeacherProfile({
          ...profileData,
          userId: ctx.user.id,
        });
        
        if (profileId && categoryIds && categoryIds.length > 0) {
          await db.setTeacherCategories(profileId, categoryIds);
        }
        
        // Update user role to teacher
        await db.updateUserRole(ctx.user.id, 'teacher');
        
        return { success: true, profileId };
      }),
    
    updateProfile: teacherProcedure
      .input(z.object({
        displayName: z.string().min(1).optional(),
        title: z.string().optional(),
        bio: z.string().optional(),
        experience: z.string().optional(),
        qualifications: z.string().optional(),
        avatarUrl: z.string().optional(),
        coverImageUrl: z.string().optional(),
        region: z.string().optional(),
        address: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        website: z.string().optional(),
        categoryIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getTeacherProfileByUserId(ctx.user.id);
        if (!profile) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '找不到您的老師資料' });
        }
        
        const { categoryIds, ...profileData } = input;
        await db.updateTeacherProfile(profile.id, profileData);
        
        if (categoryIds) {
          await db.setTeacherCategories(profile.id, categoryIds);
        }
        
        return { success: true };
      }),
    
    // Services management
    getServices: teacherProcedure.query(async ({ ctx }) => {
      const profile = await db.getTeacherProfileByUserId(ctx.user.id);
      if (!profile) return [];
      return db.getServicesByTeacher(profile.id);
    }),
    
    createService: teacherProcedure
      .input(z.object({
        categoryId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        serviceType: z.enum(["reading", "course", "consultation"]),
        duration: z.number().min(15),
        price: z.string(),
        currency: z.string().default("HKD"),
        isOnline: z.boolean().default(false),
        isInPerson: z.boolean().default(true),
        maxParticipants: z.number().min(1).default(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getTeacherProfileByUserId(ctx.user.id);
        if (!profile) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '請先建立老師資料' });
        }
        
        const serviceId = await db.createService({
          ...input,
          teacherProfileId: profile.id,
        });
        
        return { success: true, serviceId };
      }),
    
    updateService: teacherProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        serviceType: z.enum(["reading", "course", "consultation"]).optional(),
        duration: z.number().min(15).optional(),
        price: z.string().optional(),
        isOnline: z.boolean().optional(),
        isInPerson: z.boolean().optional(),
        maxParticipants: z.number().min(1).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getTeacherProfileByUserId(ctx.user.id);
        if (!profile) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        const service = await db.getServiceById(input.id);
        if (!service || service.teacherProfileId !== profile.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        const { id, ...data } = input;
        await db.updateService(id, data);
        return { success: true };
      }),
    
    deleteService: teacherProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getTeacherProfileByUserId(ctx.user.id);
        if (!profile) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        const service = await db.getServiceById(input.id);
        if (!service || service.teacherProfileId !== profile.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        await db.deleteService(input.id);
        return { success: true };
      }),
    
    // Availability management
    getAvailability: teacherProcedure.query(async ({ ctx }) => {
      const profile = await db.getTeacherProfileByUserId(ctx.user.id);
      if (!profile) return [];
      return db.getTeacherAvailability(profile.id);
    }),
    
    setAvailability: teacherProcedure
      .input(z.array(z.object({
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string(),
        endTime: z.string(),
      })))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getTeacherProfileByUserId(ctx.user.id);
        if (!profile) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '請先建立老師資料' });
        }
        
        await db.setTeacherAvailability(
          profile.id,
          input.map(slot => ({ ...slot, teacherProfileId: profile.id }))
        );
        
        return { success: true };
      }),
    
    // Bookings management
    getBookings: teacherProcedure.query(async ({ ctx }) => {
      const profile = await db.getTeacherProfileByUserId(ctx.user.id);
      if (!profile) return [];
      return db.getBookingsByTeacher(profile.id);
    }),
    
    updateBookingStatus: teacherProcedure
      .input(z.object({
        bookingId: z.number(),
        status: z.enum(["confirmed", "cancelled"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getTeacherProfileByUserId(ctx.user.id);
        if (!profile) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        const booking = await db.getBookingById(input.bookingId);
        if (!booking || booking.teacherProfileId !== profile.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        await db.updateBookingStatus(input.bookingId, input.status);
        
        // Create notification for user
        const statusText = input.status === 'confirmed' ? '已確認' : '已取消';
        await db.createNotification({
          userId: booking.userId,
          type: input.status === 'confirmed' ? 'booking_confirmed' : 'booking_cancelled',
          title: `預約${statusText}`,
          message: `您的預約已被老師${statusText}`,
          relatedBookingId: input.bookingId,
        });
        
        return { success: true };
      }),
    
    // Reply to review
    replyToReview: teacherProcedure
      .input(z.object({
        reviewId: z.number(),
        reply: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.addTeacherReply(input.reviewId, input.reply);
        return { success: true };
      }),
    
    // Get reviews for management (with reply functionality)
    getReviews: teacherProcedure.query(async ({ ctx }) => {
      const profile = await db.getTeacherProfileByUserId(ctx.user.id);
      if (!profile) return [];
      return db.getTeacherReviewsForManagement(profile.id);
    }),
    
    // Get income statistics
    getIncomeStats: teacherProcedure.query(async ({ ctx }) => {
      const profile = await db.getTeacherProfileByUserId(ctx.user.id);
      if (!profile) return { totalIncome: 0, thisMonthIncome: 0, lastMonthIncome: 0, completedBookings: 0 };
      return db.getTeacherIncomeStats(profile.id);
    }),
    
    // Get monthly income for charts
    getMonthlyIncome: teacherProcedure.query(async ({ ctx }) => {
      const profile = await db.getTeacherProfileByUserId(ctx.user.id);
      if (!profile) return [];
      return db.getTeacherMonthlyIncome(profile.id);
    }),
    
    // Get client list
    getClients: teacherProcedure.query(async ({ ctx }) => {
      const profile = await db.getTeacherProfileByUserId(ctx.user.id);
      if (!profile) return [];
      return db.getTeacherClients(profile.id);
    }),
    
    // Get booking statistics
    getBookingStats: teacherProcedure.query(async ({ ctx }) => {
      const profile = await db.getTeacherProfileByUserId(ctx.user.id);
      if (!profile) return { pending: 0, confirmed: 0, completed: 0, cancelled: 0, thisMonth: 0 };
      return db.getTeacherBookingStats(profile.id);
    }),
  }),

  // ============ USER DASHBOARD ============
  userDashboard: router({
    getBookings: protectedProcedure.query(async ({ ctx }) => {
      return db.getBookingsByUser(ctx.user.id);
    }),
    
    getFavorites: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserFavorites(ctx.user.id);
    }),
    
    toggleFavorite: protectedProcedure
      .input(z.object({ teacherProfileId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const isFav = await db.isFavorite(ctx.user.id, input.teacherProfileId);
        if (isFav) {
          await db.removeFavorite(ctx.user.id, input.teacherProfileId);
        } else {
          await db.addFavorite(ctx.user.id, input.teacherProfileId);
        }
        return { isFavorite: !isFav };
      }),
    
    checkFavorite: protectedProcedure
      .input(z.object({ teacherProfileId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.isFavorite(ctx.user.id, input.teacherProfileId);
      }),
    
    getMyReviews: protectedProcedure.query(async ({ ctx }) => {
      return db.getReviewsByUser(ctx.user.id);
    }),
  }),

  // ============ BOOKINGS ============
  bookings: router({
    create: protectedProcedure
      .input(z.object({
        teacherProfileId: z.number(),
        serviceId: z.number(),
        bookingDate: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        notes: z.string().optional(),
        userPhone: z.string().optional(),
        userEmail: z.string().email().optional(),
        isOnline: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const service = await db.getServiceById(input.serviceId);
        if (!service) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '找不到該服務' });
        }
        
        // Check for time conflicts
        const hasConflict = await db.checkBookingConflict(
          input.teacherProfileId,
          new Date(input.bookingDate),
          input.startTime,
          input.endTime
        );
        
        if (hasConflict) {
          throw new TRPCError({ code: 'CONFLICT', message: '該時段已被預約，請選擇其他時間' });
        }
        
        const bookingId = await db.createBooking({
          ...input,
          userId: ctx.user.id,
          bookingDate: new Date(input.bookingDate),
          totalAmount: service.price,
          currency: service.currency,
        });
        
        // Create notification for teacher
        const profile = await db.getTeacherProfileById(input.teacherProfileId);
        if (profile) {
          await db.createNotification({
            userId: profile.userId,
            type: 'booking_new',
            title: '新預約通知',
            message: `您收到一個新的預約請求`,
            relatedBookingId: bookingId,
          });
        }
        
        return { success: true, bookingId };
      }),
    
    createCheckoutSession: protectedProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.bookingId);
        if (!booking || booking.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        if (booking.paymentStatus === 'paid') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: '此預約已付款' });
        }
        
        const service = await db.getServiceById(booking.serviceId);
        const teacherProfile = await db.getTeacherProfileById(booking.teacherProfileId);
        
        if (!service || !teacherProfile) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        const { createBookingCheckoutSession } = await import('./stripe/stripe');
        
        const origin = ctx.req.headers.origin || 'http://localhost:3000';
        const checkoutUrl = await createBookingCheckoutSession({
          bookingId: booking.id,
          userId: ctx.user.id,
          userEmail: ctx.user.email || '',
          userName: ctx.user.name || '',
          teacherProfileId: teacherProfile.id,
          teacherName: teacherProfile.displayName,
          serviceId: service.id,
          serviceName: service.name,
          amount: Math.round(parseFloat(booking.totalAmount) * 100), // Convert to cents
          currency: booking.currency.toLowerCase(),
          origin,
        });
        
        return { checkoutUrl };
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.id);
        if (!booking) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        // Check permission
        const profile = await db.getTeacherProfileByUserId(ctx.user.id);
        if (booking.userId !== ctx.user.id && (!profile || booking.teacherProfileId !== profile.id)) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        const service = await db.getServiceById(booking.serviceId);
        const teacherProfile = await db.getTeacherProfileById(booking.teacherProfileId);
        
        return { booking, service, teacherProfile };
      }),
    
    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.id);
        if (!booking || booking.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        if (booking.status !== 'pending' && booking.status !== 'confirmed') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: '無法取消此預約' });
        }
        
        await db.updateBookingStatus(input.id, 'cancelled');
        
        // Notify teacher
        const profile = await db.getTeacherProfileById(booking.teacherProfileId);
        if (profile) {
          await db.createNotification({
            userId: profile.userId,
            type: 'booking_cancelled',
            title: '預約已取消',
            message: '用戶已取消預約',
            relatedBookingId: input.id,
          });
        }
        
        return { success: true };
      }),
    
    // Check time slot availability
    checkAvailability: publicProcedure
      .input(z.object({
        teacherProfileId: z.number(),
        date: z.string(),
        startTime: z.string(),
        endTime: z.string(),
      }))
      .query(async ({ input }) => {
        const hasConflict = await db.checkBookingConflict(
          input.teacherProfileId,
          new Date(input.date),
          input.startTime,
          input.endTime
        );
        return { available: !hasConflict };
      }),
    
    // Get booked slots for a date
    getBookedSlots: publicProcedure
      .input(z.object({
        teacherProfileId: z.number(),
        date: z.string(),
      }))
      .query(async ({ input }) => {
        return db.getBookedSlots(input.teacherProfileId, new Date(input.date));
      }),
    
    // Reschedule booking
    reschedule: protectedProcedure
      .input(z.object({
        bookingId: z.number(),
        newDate: z.string(),
        newStartTime: z.string(),
        newEndTime: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.bookingId);
        if (!booking || booking.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        if (booking.status === 'cancelled' || booking.status === 'completed') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: '無法改期此預約' });
        }
        
        // Check for conflicts
        const hasConflict = await db.checkBookingConflict(
          booking.teacherProfileId,
          new Date(input.newDate),
          input.newStartTime,
          input.newEndTime,
          input.bookingId
        );
        
        if (hasConflict) {
          throw new TRPCError({ code: 'CONFLICT', message: '該時段已被預約，請選擇其他時間' });
        }
        
        await db.rescheduleBooking(
          input.bookingId,
          new Date(input.newDate),
          input.newStartTime,
          input.newEndTime
        );
        
        // Notify teacher
        const profile = await db.getTeacherProfileById(booking.teacherProfileId);
        if (profile) {
          await db.createNotification({
            userId: profile.userId,
            type: 'booking_rescheduled',
            title: '預約改期通知',
            message: '用戶已更改預約時間，請確認',
            relatedBookingId: input.bookingId,
          });
        }
        
        return { success: true };
      }),
  }),

  // ============ REVIEWS ============
  reviews: router({
    create: protectedProcedure
      .input(z.object({
        teacherProfileId: z.number(),
        bookingId: z.number().optional(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if booking exists and belongs to user
        let isVerified = false;
        if (input.bookingId) {
          const booking = await db.getBookingById(input.bookingId);
          if (booking && booking.userId === ctx.user.id && booking.status === 'completed') {
            isVerified = true;
          }
          
          // Check if already reviewed
          const existingReview = await db.getReviewByBooking(input.bookingId);
          if (existingReview) {
            throw new TRPCError({ code: 'CONFLICT', message: '您已經評價過此預約' });
          }
        }
        
        const reviewId = await db.createReview({
          ...input,
          userId: ctx.user.id,
          isVerified,
        });
        
        // Notify teacher
        const profile = await db.getTeacherProfileById(input.teacherProfileId);
        if (profile) {
          await db.createNotification({
            userId: profile.userId,
            type: 'review_new',
            title: '新評價通知',
            message: `您收到一個新的${input.rating}星評價`,
            relatedBookingId: input.bookingId,
          });
        }
        
        return { success: true, reviewId };
      }),
  }),

  // ============ NOTIFICATIONS ============
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getNotificationsByUser(ctx.user.id);
    }),
    
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadNotificationCount(ctx.user.id);
    }),
    
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationRead(input.id);
        return { success: true };
      }),
    
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // ============ ADMIN ============
  admin: router({
    setFeatured: adminProcedure
      .input(z.object({
        teacherProfileId: z.number(),
        isFeatured: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await db.updateTeacherProfile(input.teacherProfileId, { isFeatured: input.isFeatured });
        return { success: true };
      }),
    
    verifyTeacher: adminProcedure
      .input(z.object({
        teacherProfileId: z.number(),
        isVerified: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await db.updateTeacherProfile(input.teacherProfileId, { isVerified: input.isVerified });
        return { success: true };
      }),
  }),
  
  superadmin: router({
    getAllUsers: superadminProcedure
      .input(z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        role: z.enum(['user', 'teacher', 'admin', 'superadmin']).optional(),
      }))
      .query(async ({ input }) => {
        return db.getAllUsers(input.page, input.limit, input.role);
      }),
    
    getAllTeachers: superadminProcedure
      .input(z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
      }))
      .query(async ({ input }) => {
        return db.getAllTeachers(input.page, input.limit);
      }),
    
    createUser: superadminProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string(),
        role: z.enum(['user', 'teacher', 'admin', 'superadmin']).default('user'),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({ code: 'CONFLICT', message: '該電郵地址已存在' });
        }
        
        const userId = await db.createUserWithoutPassword({
          email: input.email,
          name: input.name,
          role: input.role,
          phone: input.phone,
        });
        
        return { success: true, userId };
      }),
    
    updateUser: superadminProcedure
      .input(z.object({
        userId: z.number(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        role: z.enum(['user', 'teacher', 'admin', 'superadmin']).optional(),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { userId, ...updates } = input;
        await db.updateUser(userId, updates);
        return { success: true };
      }),
    
    deleteUser: superadminProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteUser(input.userId);
        return { success: true };
      }),
    
    getAnalytics: superadminProcedure
      .query(async () => {
        return db.getAnalyticsData();
      }),
    
    exportUsers: superadminProcedure
      .query(async () => {
        return db.getAllUsersForExport();
      }),
    
    exportTeachers: superadminProcedure
      .query(async () => {
        return db.getAllTeachersForExport();
      }),
    
    createTeacher: superadminProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        title: z.string().optional(),
        region: z.string().optional(),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({ code: 'CONFLICT', message: '該電郵地址已存在' });
        }
        
        const userId = await db.createUserWithoutPassword({
          email: input.email,
          name: input.name,
          role: 'teacher',
          phone: input.phone,
        });
        
        await db.createTeacherProfile({
          userId,
          displayName: input.name,
          title: input.title,
          region: input.region,
        });
        
        return { success: true, userId };
      }),
    
    deleteTeacher: superadminProcedure
      .input(z.string())
      .mutation(async ({ input: teacherId }) => {
        const profileId = parseInt(teacherId, 10);
        if (isNaN(profileId)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid teacher ID' });
        }
        await db.deleteUser(profileId);
        return { success: true };
      }),
    
    getPendingVerifications: superadminProcedure
      .input(z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
      }))
      .query(async ({ input }) => {
        const offset = (input.page - 1) * input.limit;
        const verifications = await db.getPendingVerifications(input.limit, offset);
        const total = await db.getPendingVerificationsCount();
        return {
          verifications,
          total,
          page: input.page,
          limit: input.limit,
        };
      }),
    
    getVerificationDetail: superadminProcedure
      .input(z.object({
        verificationId: z.number(),
      }))
      .query(async ({ input }) => {
        return db.getVerificationDetail(input.verificationId);
      }),
    
    reviewVerification: superadminProcedure
      .input(z.object({
        verificationId: z.number(),
        status: z.enum(['approved', 'rejected']),
        reviewNotes: z.string().optional(),
        rejectionReason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.id) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '未授權' });
        }
        return db.reviewVerification({
          verificationId: input.verificationId,
          status: input.status,
          reviewedBy: ctx.user.id,
          reviewNotes: input.reviewNotes,
          rejectionReason: input.rejectionReason,
        });
      }),
    
    getVerificationTypes: superadminProcedure
      .query(async () => {
        return db.getVerificationTypes();
      }),
    
    createVerificationType: superadminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        isRequired: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createVerificationType(input);
      })
  }),
});

export type AppRouter = typeof appRouter;
