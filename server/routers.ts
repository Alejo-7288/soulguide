import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '需要管理員權限' });
  }
  return next({ ctx });
});

// Teacher-only procedure
const teacherProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'teacher' && ctx.user.role !== 'admin') {
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
});

export type AppRouter = typeof appRouter;
