import { eq, and, desc, asc, like, or, sql, inArray, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  categories, Category, InsertCategory,
  teacherProfiles, TeacherProfile, InsertTeacherProfile,
  teacherCategories, TeacherCategory, InsertTeacherCategory,
  services, Service, InsertService,
  availability, Availability, InsertAvailability,
  bookings, Booking, InsertBooking,
  reviews, Review, InsertReview,
  notifications, Notification, InsertNotification,
  favorites, Favorite, InsertFavorite,
  teacherApprovalHistory, TeacherApprovalHistory, InsertTeacherApprovalHistory,
  googleCalendarTokens, GoogleCalendarToken, InsertGoogleCalendarToken,
  googleCalendarBusySlots, GoogleCalendarBusySlot, InsertGoogleCalendarBusySlot
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER FUNCTIONS ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "avatarUrl", "phone"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      // Only set role to 'admin' for new users, not for existing users
      values.role = 'admin';
      // Don't update the role for existing users
      // updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserRole(userId: number, role: "user" | "admin" | "teacher") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUserWithEmail(data: {
  email: string;
  passwordHash: string;
  name: string;
  phone?: string;
  instagram?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Generate a unique openId for email users
  const openId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  const result = await db.insert(users).values({
    openId,
    email: data.email,
    passwordHash: data.passwordHash,
    name: data.name,
    phone: data.phone || null,
    instagram: data.instagram || null,
    loginMethod: 'email',
    isEmailVerified: false,
    lastSignedIn: new Date(),
  });
  
  return result[0].insertId;
}

export async function updateUserProfile(userId: number, data: {
  name?: string;
  phone?: string;
  instagram?: string;
  avatarUrl?: string;
}) {
  const db = await getDb();
  if (!db) return;
  
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.instagram !== undefined) updateData.instagram = data.instagram;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
  
  if (Object.keys(updateData).length > 0) {
    await db.update(users).set(updateData).where(eq(users.id, userId));
  }
}

export async function updateUserLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

// ============ CATEGORY FUNCTIONS ============
export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(asc(categories.sortOrder));
}

export async function getCategoryBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCategory(data: InsertCategory) {
  const db = await getDb();
  if (!db) return;
  await db.insert(categories).values(data);
}

// ============ TEACHER PROFILE FUNCTIONS ============
export async function getTeacherProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(teacherProfiles).where(eq(teacherProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTeacherProfileById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(teacherProfiles).where(eq(teacherProfiles.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createTeacherProfile(data: InsertTeacherProfile) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(teacherProfiles).values(data);
  return result[0].insertId;
}

export async function updateTeacherProfile(id: number, data: Partial<InsertTeacherProfile>) {
  const db = await getDb();
  if (!db) return;
  await db.update(teacherProfiles).set(data).where(eq(teacherProfiles.id, id));
}

export async function searchTeachers(params: {
  categoryId?: number;
  region?: string;
  query?: string;
  sortBy?: "rating" | "bookings" | "newest";
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { teachers: [], total: 0 };

  const { categoryId, region, query, sortBy = "rating", limit = 20, offset = 0 } = params;

  let baseQuery = db
    .select({
      profile: teacherProfiles,
      user: users,
    })
    .from(teacherProfiles)
    .innerJoin(users, eq(teacherProfiles.userId, users.id))
    .where(eq(teacherProfiles.isActive, true))
    .$dynamic();

  // Apply filters - 只顯示已批准的師傅
  const conditions = [
    eq(teacherProfiles.isActive, true),
    eq(teacherProfiles.status, 'approved')
  ];
  
  if (region) {
    conditions.push(eq(teacherProfiles.region, region));
  }
  
  if (query) {
    conditions.push(
      or(
        like(teacherProfiles.displayName, `%${query}%`),
        like(teacherProfiles.bio, `%${query}%`),
        like(teacherProfiles.title, `%${query}%`)
      )!
    );
  }

  // Build the query with conditions
  let teacherQuery = db
    .select({
      profile: teacherProfiles,
      user: users,
    })
    .from(teacherProfiles)
    .innerJoin(users, eq(teacherProfiles.userId, users.id))
    .where(and(...conditions))
    .$dynamic();

  // If categoryId is provided, join with teacherCategories
  if (categoryId) {
    teacherQuery = db
      .select({
        profile: teacherProfiles,
        user: users,
      })
      .from(teacherProfiles)
      .innerJoin(users, eq(teacherProfiles.userId, users.id))
      .innerJoin(teacherCategories, eq(teacherProfiles.id, teacherCategories.teacherProfileId))
      .where(and(...conditions, eq(teacherCategories.categoryId, categoryId)))
      .$dynamic();
  }

  // Apply sorting
  if (sortBy === "rating") {
    teacherQuery = teacherQuery.orderBy(desc(teacherProfiles.averageRating));
  } else if (sortBy === "bookings") {
    teacherQuery = teacherQuery.orderBy(desc(teacherProfiles.totalBookings));
  } else {
    teacherQuery = teacherQuery.orderBy(desc(teacherProfiles.createdAt));
  }

  const teachers = await teacherQuery.limit(limit).offset(offset);

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(teacherProfiles)
    .where(and(...conditions));
  
  const total = countResult[0]?.count ?? 0;

  return { teachers, total };
}

export async function getFeaturedTeachers(limit = 6) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      profile: teacherProfiles,
      user: users,
    })
    .from(teacherProfiles)
    .innerJoin(users, eq(teacherProfiles.userId, users.id))
    .where(and(eq(teacherProfiles.isActive, true), eq(teacherProfiles.isFeatured, true)))
    .orderBy(desc(teacherProfiles.averageRating))
    .limit(limit);
}

export async function getTopRatedTeachers(limit = 10) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      profile: teacherProfiles,
      user: users,
    })
    .from(teacherProfiles)
    .innerJoin(users, eq(teacherProfiles.userId, users.id))
    .where(eq(teacherProfiles.isActive, true))
    .orderBy(desc(teacherProfiles.averageRating), desc(teacherProfiles.totalReviews))
    .limit(limit);
}

// ============ TEACHER CATEGORIES FUNCTIONS ============
export async function getTeacherCategories(teacherProfileId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      category: categories,
    })
    .from(teacherCategories)
    .innerJoin(categories, eq(teacherCategories.categoryId, categories.id))
    .where(eq(teacherCategories.teacherProfileId, teacherProfileId));
}

export async function setTeacherCategories(teacherProfileId: number, categoryIds: number[]) {
  const db = await getDb();
  if (!db) return;

  // Delete existing
  await db.delete(teacherCategories).where(eq(teacherCategories.teacherProfileId, teacherProfileId));

  // Insert new
  if (categoryIds.length > 0) {
    await db.insert(teacherCategories).values(
      categoryIds.map(categoryId => ({ teacherProfileId, categoryId }))
    );
  }
}

// ============ SERVICE FUNCTIONS ============
export async function getServicesByTeacher(teacherProfileId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      service: services,
      category: categories,
    })
    .from(services)
    .innerJoin(categories, eq(services.categoryId, categories.id))
    .where(and(eq(services.teacherProfileId, teacherProfileId), eq(services.isActive, true)))
    .orderBy(asc(services.name));
}

export async function getServiceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createService(data: InsertService) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(services).values(data);
  return result[0].insertId;
}

export async function updateService(id: number, data: Partial<InsertService>) {
  const db = await getDb();
  if (!db) return;
  await db.update(services).set(data).where(eq(services.id, id));
}

export async function deleteService(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(services).set({ isActive: false }).where(eq(services.id, id));
}

// ============ AVAILABILITY FUNCTIONS ============
export async function getTeacherAvailability(teacherProfileId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(availability)
    .where(and(eq(availability.teacherProfileId, teacherProfileId), eq(availability.isActive, true)))
    .orderBy(asc(availability.dayOfWeek), asc(availability.startTime));
}

export async function setTeacherAvailability(teacherProfileId: number, slots: InsertAvailability[]) {
  const db = await getDb();
  if (!db) return;

  // Delete existing
  await db.delete(availability).where(eq(availability.teacherProfileId, teacherProfileId));

  // Insert new
  if (slots.length > 0) {
    await db.insert(availability).values(slots);
  }
}

// ============ BOOKING FUNCTIONS ============
export async function createBooking(data: InsertBooking) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(bookings).values(data);
  return result[0].insertId;
}

export async function getBookingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBookingsByUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      booking: bookings,
      service: services,
      teacherProfile: teacherProfiles,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .innerJoin(teacherProfiles, eq(bookings.teacherProfileId, teacherProfiles.id))
    .where(eq(bookings.userId, userId))
    .orderBy(desc(bookings.bookingDate))
    .limit(limit);
}

export async function getBookingsByTeacher(teacherProfileId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      booking: bookings,
      service: services,
      user: users,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .innerJoin(users, eq(bookings.userId, users.id))
    .where(eq(bookings.teacherProfileId, teacherProfileId))
    .orderBy(desc(bookings.bookingDate))
    .limit(limit);
}

export async function updateBookingStatus(id: number, status: Booking["status"]) {
  const db = await getDb();
  if (!db) return;
  await db.update(bookings).set({ status }).where(eq(bookings.id, id));
}

export async function updateBookingPayment(id: number, paymentStatus: Booking["paymentStatus"], stripePaymentIntentId?: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(bookings).set({ 
    paymentStatus, 
    stripePaymentIntentId: stripePaymentIntentId ?? null 
  }).where(eq(bookings.id, id));
}

// Check for booking time conflicts
export async function checkBookingConflict(
  teacherProfileId: number,
  bookingDate: Date,
  startTime: string,
  endTime: string,
  excludeBookingId?: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Get the date string for comparison
  const dateStr = bookingDate.toISOString().split('T')[0];
  
  const conditions = [
    eq(bookings.teacherProfileId, teacherProfileId),
    sql`DATE(${bookings.bookingDate}) = ${dateStr}`,
    sql`${bookings.status} NOT IN ('cancelled', 'refunded')`,
    // Check time overlap: (start1 < end2) AND (end1 > start2)
    sql`${bookings.startTime} < ${endTime}`,
    sql`${bookings.endTime} > ${startTime}`,
  ];

  if (excludeBookingId) {
    conditions.push(sql`${bookings.id} != ${excludeBookingId}`);
  }

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookings)
    .where(and(...conditions));

  return (result[0]?.count ?? 0) > 0;
}

// Get booked time slots for a teacher on a specific date
export async function getBookedSlots(
  teacherProfileId: number,
  bookingDate: Date
): Promise<{ startTime: string; endTime: string }[]> {
  const db = await getDb();
  if (!db) return [];

  const dateStr = bookingDate.toISOString().split('T')[0];

  const result = await db
    .select({
      startTime: bookings.startTime,
      endTime: bookings.endTime,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.teacherProfileId, teacherProfileId),
        sql`DATE(${bookings.bookingDate}) = ${dateStr}`,
        sql`${bookings.status} NOT IN ('cancelled', 'refunded')`
      )
    );

  return result;
}

// Reschedule a booking
export async function rescheduleBooking(
  id: number,
  newDate: Date,
  newStartTime: string,
  newEndTime: string
) {
  const db = await getDb();
  if (!db) return;
  await db.update(bookings).set({
    bookingDate: newDate,
    startTime: newStartTime,
    endTime: newEndTime,
    status: 'pending', // Reset to pending for teacher confirmation
  }).where(eq(bookings.id, id));
}

// ============ REVIEW FUNCTIONS ============
export async function createReview(data: InsertReview) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(reviews).values(data);
  
  // Update teacher stats
  await updateTeacherReviewStats(data.teacherProfileId);
  
  return result[0].insertId;
}

export async function getReviewsByTeacher(teacherProfileId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      review: reviews,
      user: users,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(and(eq(reviews.teacherProfileId, teacherProfileId), eq(reviews.isVisible, true)))
    .orderBy(desc(reviews.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getReviewByBooking(bookingId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(reviews).where(eq(reviews.bookingId, bookingId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getReviewsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  // Get reviews with teacher profile info
  // Note: reviews don't have serviceId, so we join through bookings if available
  const result = await db
    .select({
      review: reviews,
      teacherProfile: teacherProfiles,
      booking: bookings,
    })
    .from(reviews)
    .innerJoin(teacherProfiles, eq(reviews.teacherProfileId, teacherProfiles.id))
    .leftJoin(bookings, eq(reviews.bookingId, bookings.id))
    .where(eq(reviews.userId, userId))
    .orderBy(desc(reviews.createdAt));

  // Fetch service info for each review that has a booking
  const reviewsWithService = await Promise.all(
    result.map(async (r) => {
      let service = null;
      if (r.booking?.serviceId) {
        const serviceResult = await db.select().from(services).where(eq(services.id, r.booking.serviceId)).limit(1);
        service = serviceResult[0] || null;
      }
      return {
        review: r.review,
        teacherProfile: r.teacherProfile,
        service,
      };
    })
  );

  return reviewsWithService;
}

export async function addTeacherReply(reviewId: number, reply: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(reviews).set({ 
    teacherReply: reply, 
    teacherReplyAt: new Date() 
  }).where(eq(reviews.id, reviewId));
}

async function updateTeacherReviewStats(teacherProfileId: number) {
  const db = await getDb();
  if (!db) return;

  const stats = await db
    .select({
      avgRating: sql<string>`AVG(rating)`,
      totalReviews: sql<number>`COUNT(*)`,
    })
    .from(reviews)
    .where(and(eq(reviews.teacherProfileId, teacherProfileId), eq(reviews.isVisible, true)));

  if (stats[0]) {
    await db.update(teacherProfiles).set({
      averageRating: stats[0].avgRating ?? "0.00",
      totalReviews: stats[0].totalReviews ?? 0,
    }).where(eq(teacherProfiles.id, teacherProfileId));
  }
}

// ============ NOTIFICATION FUNCTIONS ============
export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(notifications).values(data);
  return result[0].insertId;
}

export async function getNotificationsByUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return result[0]?.count ?? 0;
}

// ============ FAVORITES FUNCTIONS ============
export async function addFavorite(userId: number, teacherProfileId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(favorites).values({ userId, teacherProfileId }).onDuplicateKeyUpdate({
    set: { userId }
  });
}

export async function removeFavorite(userId: number, teacherProfileId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(favorites).where(
    and(eq(favorites.userId, userId), eq(favorites.teacherProfileId, teacherProfileId))
  );
}

export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      favorite: favorites,
      profile: teacherProfiles,
    })
    .from(favorites)
    .innerJoin(teacherProfiles, eq(favorites.teacherProfileId, teacherProfiles.id))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));
}

export async function isFavorite(userId: number, teacherProfileId: number) {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.teacherProfileId, teacherProfileId)))
    .limit(1);

  return result.length > 0;
}

// ============ STATS FUNCTIONS ============
export async function incrementTeacherBookings(teacherProfileId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(teacherProfiles).set({
    totalBookings: sql`${teacherProfiles.totalBookings} + 1`
  }).where(eq(teacherProfiles.id, teacherProfileId));
}

export async function getDistinctRegions() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .selectDistinct({ region: teacherProfiles.region })
    .from(teacherProfiles)
    .where(and(eq(teacherProfiles.isActive, true), sql`${teacherProfiles.region} IS NOT NULL`));

  return result.map(r => r.region).filter(Boolean) as string[];
}


// ============ TEACHER DASHBOARD EXTENDED FUNCTIONS ============

// Get all reviews for a teacher (including those without replies for management)
export async function getTeacherReviewsForManagement(teacherProfileId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      review: reviews,
      user: users,
      booking: bookings,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .leftJoin(bookings, eq(reviews.bookingId, bookings.id))
    .where(eq(reviews.teacherProfileId, teacherProfileId))
    .orderBy(desc(reviews.createdAt));
}

// Get income statistics for a teacher
export async function getTeacherIncomeStats(teacherProfileId: number) {
  const db = await getDb();
  if (!db) return { totalIncome: 0, thisMonthIncome: 0, lastMonthIncome: 0, completedBookings: 0 };

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Total income from completed bookings
  const totalResult = await db
    .select({
      total: sql<string>`COALESCE(SUM(total_amount), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(bookings)
    .where(and(
      eq(bookings.teacherProfileId, teacherProfileId),
      eq(bookings.status, 'completed')
    ));

  // This month income
  const thisMonthResult = await db
    .select({
      total: sql<string>`COALESCE(SUM(total_amount), 0)`,
    })
    .from(bookings)
    .where(and(
      eq(bookings.teacherProfileId, teacherProfileId),
      eq(bookings.status, 'completed'),
      sql`${bookings.bookingDate} >= ${thisMonthStart.toISOString().split('T')[0]}`
    ));

  // Last month income
  const lastMonthResult = await db
    .select({
      total: sql<string>`COALESCE(SUM(total_amount), 0)`,
    })
    .from(bookings)
    .where(and(
      eq(bookings.teacherProfileId, teacherProfileId),
      eq(bookings.status, 'completed'),
      sql`${bookings.bookingDate} >= ${lastMonthStart.toISOString().split('T')[0]}`,
      sql`${bookings.bookingDate} <= ${lastMonthEnd.toISOString().split('T')[0]}`
    ));

  return {
    totalIncome: parseFloat(totalResult[0]?.total || '0'),
    thisMonthIncome: parseFloat(thisMonthResult[0]?.total || '0'),
    lastMonthIncome: parseFloat(lastMonthResult[0]?.total || '0'),
    completedBookings: totalResult[0]?.count || 0,
  };
}

// Get monthly income data for charts (last 6 months)
export async function getTeacherMonthlyIncome(teacherProfileId: number) {
  const db = await getDb();
  if (!db) return [];

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const result = await db
    .select({
      month: sql<string>`DATE_FORMAT(booking_date, '%Y-%m')`,
      total: sql<string>`COALESCE(SUM(total_amount), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(bookings)
    .where(and(
      eq(bookings.teacherProfileId, teacherProfileId),
      eq(bookings.status, 'completed'),
      sql`${bookings.bookingDate} >= ${sixMonthsAgo.toISOString().split('T')[0]}`
    ))
    .groupBy(sql`DATE_FORMAT(booking_date, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(booking_date, '%Y-%m')`);

  return result.map(r => ({
    month: r.month,
    income: parseFloat(r.total || '0'),
    bookings: r.count,
  }));
}

// Get unique clients (users who have booked with this teacher)
export async function getTeacherClients(teacherProfileId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      user: users,
      totalBookings: sql<number>`COUNT(DISTINCT ${bookings.id})`,
      totalSpent: sql<string>`COALESCE(SUM(${bookings.totalAmount}), 0)`,
      lastBooking: sql<Date>`MAX(${bookings.bookingDate})`,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .where(eq(bookings.teacherProfileId, teacherProfileId))
    .groupBy(users.id)
    .orderBy(desc(sql`MAX(${bookings.bookingDate})`));

  return result.map(r => ({
    user: r.user,
    totalBookings: r.totalBookings,
    totalSpent: parseFloat(r.totalSpent || '0'),
    lastBooking: r.lastBooking,
  }));
}

// Get booking statistics for teacher dashboard
export async function getTeacherBookingStats(teacherProfileId: number) {
  const db = await getDb();
  if (!db) return { pending: 0, confirmed: 0, completed: 0, cancelled: 0, thisMonth: 0 };

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const statusCounts = await db
    .select({
      status: bookings.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(bookings)
    .where(eq(bookings.teacherProfileId, teacherProfileId))
    .groupBy(bookings.status);

  const thisMonthCount = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(bookings)
    .where(and(
      eq(bookings.teacherProfileId, teacherProfileId),
      sql`${bookings.bookingDate} >= ${thisMonthStart.toISOString().split('T')[0]}`
    ));

  const stats: Record<string, number> = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
  statusCounts.forEach(s => {
    if (s.status && stats.hasOwnProperty(s.status)) {
      stats[s.status] = s.count;
    }
  });

  return {
    ...stats,
    thisMonth: thisMonthCount[0]?.count || 0,
  };
}


// ============ SUPERADMIN FUNCTIONS ============

export async function getAllUsers(page: number = 1, limit: number = 20, role?: string) {
  const db = await getDb();
  if (!db) return { users: [], total: 0 };

  const offset = (page - 1) * limit;
  
  const whereClause = role ? eq(users.role, role as any) : undefined;
  
  const data = await db
    .select()
    .from(users)
    .where(whereClause)
    .limit(limit)
    .offset(offset);
  
  const countResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(users)
    .where(whereClause);
  
  return {
    users: data,
    total: countResult[0]?.count || 0,
  };
}

export async function getAllTeachers(page: number = 1, limit: number = 20) {
  const db = await getDb();
  if (!db) return { teachers: [], total: 0 };

  const offset = (page - 1) * limit;
  
  const data = await db
    .select({
      profile: teacherProfiles,
      user: users,
    })
    .from(teacherProfiles)
    .innerJoin(users, eq(teacherProfiles.userId, users.id))
    .limit(limit)
    .offset(offset);

  const countResult = await db.select({ count: sql<number>`COUNT(*)` }).from(teacherProfiles);
  
  return {
    teachers: data,
    total: countResult[0]?.count || 0,
  };
}

export async function createUserWithoutPassword(input: {
  email: string;
  name: string;
  role: string;
  phone?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate a unique openId
  const openId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const result = await db.insert(users).values({
    openId,
    email: input.email,
    name: input.name,
    role: input.role as any,
    phone: input.phone,
    loginMethod: 'email',
  });

  return result[0]?.insertId || 0;
}

export async function updateUser(userId: number, updates: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set(updates).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete related data first
  await db.delete(teacherProfiles).where(eq(teacherProfiles.userId, userId));
  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db.delete(bookings).where(eq(bookings.userId, userId));
  await db.delete(reviews).where(eq(reviews.userId, userId));
  await db.delete(favorites).where(eq(favorites.userId, userId));
  
  // Delete user
  await db.delete(users).where(eq(users.id, userId));
}

export async function getAnalyticsData() {
  const db = await getDb();
  if (!db) return {};

  // Get total users
  const totalUsersResult = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
  const totalUsers = totalUsersResult[0]?.count || 0;

  // Get total teachers
  const totalTeachersResult = await db.select({ count: sql<number>`COUNT(*)` }).from(teacherProfiles);
  const totalTeachers = totalTeachersResult[0]?.count || 0;

  // Get total bookings
  const totalBookingsResult = await db.select({ count: sql<number>`COUNT(*)` }).from(bookings);
  const totalBookings = totalBookingsResult[0]?.count || 0;

  // Get total reviews
  const totalReviewsResult = await db.select({ count: sql<number>`COUNT(*)` }).from(reviews);
  const totalReviews = totalReviewsResult[0]?.count || 0;

  // Get users by role
  const usersByRole = await db
    .select({
      role: users.role,
      count: sql<number>`COUNT(*)`,
    })
    .from(users)
    .groupBy(users.role);

  // Get bookings by status (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const bookingsByStatus = await db
    .select({
      status: bookings.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(bookings)
    .where(sql`${bookings.createdAt} >= ${thirtyDaysAgo}`)
    .groupBy(bookings.status);

  return {
    totalUsers,
    totalTeachers,
    totalBookings,
    totalReviews,
    usersByRole,
    bookingsByStatus,
  };
}

export async function getAllUsersForExport() {
  const db = await getDb();
  if (!db) return [];

  return await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    phone: users.phone,
    instagram: users.instagram,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
  }).from(users);
}

export async function getAllTeachersForExport() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select({
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      displayName: teacherProfiles.displayName,
      title: teacherProfiles.title,
      region: teacherProfiles.region,
      totalBookings: teacherProfiles.totalBookings,
      totalReviews: teacherProfiles.totalReviews,
      averageRating: teacherProfiles.averageRating,
      isVerified: teacherProfiles.isVerified,
      createdAt: teacherProfiles.createdAt,
    })
    .from(teacherProfiles)
    .innerJoin(users, eq(teacherProfiles.userId, users.id));
}

// ============ VERIFICATION FUNCTIONS ============

/**
 * Upload a teacher verification file
 */
export async function uploadTeacherVerification(data: {
  teacherProfileId: number;
  verificationTypeId: number;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Database not available");
  }

  try {
    const { teacherVerifications } = await import("../drizzle/schema");
    const result = await db.insert(teacherVerifications).values({
      teacherProfileId: data.teacherProfileId,
      verificationTypeId: data.verificationTypeId,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      fileType: data.fileType,
      status: "pending",
      uploadedAt: new Date(),
    });
    return result;
  } catch (error) {
    console.error("[Database] Failed to upload verification:", error);
    throw error;
  }
}

/**
 * Get all verifications for a teacher
 */
export async function getTeacherVerifications(teacherProfileId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Database not available");
  }

  try {
    const { teacherVerifications } = await import("../drizzle/schema");
    const result = await db
      .select()
      .from(teacherVerifications)
      .where(eq(teacherVerifications.teacherProfileId, teacherProfileId))
      .orderBy(desc(teacherVerifications.uploadedAt));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get verifications:", error);
    throw error;
  }
}

/**
 * Get pending verifications for admin review
 */
export async function getPendingVerifications(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Database not available");
  }

  try {
    const { teacherVerifications, teacherProfiles, users } = await import("../drizzle/schema");
    const result = await db
      .select({
        id: teacherVerifications.id,
        teacherProfileId: teacherVerifications.teacherProfileId,
        teacherName: teacherProfiles.displayName,
        status: teacherVerifications.status,
        fileUrl: teacherVerifications.fileUrl,
        fileName: teacherVerifications.fileName,
        uploadedAt: teacherVerifications.uploadedAt,
        verificationTypeId: teacherVerifications.verificationTypeId,
      })
      .from(teacherVerifications)
      .innerJoin(
        teacherProfiles,
        eq(teacherVerifications.teacherProfileId, teacherProfiles.id)
      )
      .where(eq(teacherVerifications.status, "pending"))
      .orderBy(asc(teacherVerifications.uploadedAt))
      .limit(limit)
      .offset(offset);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get pending verifications:", error);
    throw error;
  }
}

/**
 * Get total count of pending verifications
 */
export async function getPendingVerificationsCount() {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Database not available");
  }

  try {
    const { teacherVerifications } = await import("../drizzle/schema");
    const result = await db
      .select({ count: sql`COUNT(*)` })
      .from(teacherVerifications)
      .where(eq(teacherVerifications.status, "pending"));
    return result[0]?.count || 0;
  } catch (error) {
    console.error("[Database] Failed to get pending count:", error);
    throw error;
  }
}

/**
 * Review a verification (approve or reject)
 */
export async function reviewVerification(data: {
  verificationId: number;
  status: "approved" | "rejected";
  reviewedBy: number;
  reviewNotes?: string;
  rejectionReason?: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Database not available");
  }

  try {
    const { teacherVerifications, verificationHistory } = await import("../drizzle/schema");
    
    // Update verification
    await db
      .update(teacherVerifications)
      .set({
        status: data.status,
        reviewedBy: data.reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: data.reviewNotes,
        rejectionReason: data.rejectionReason,
        updatedAt: new Date(),
      })
      .where(eq(teacherVerifications.id, data.verificationId));

    // Add to history
    await db.insert(verificationHistory).values({
      verificationId: data.verificationId,
      status: data.status,
      changedBy: data.reviewedBy,
      notes: data.reviewNotes || data.rejectionReason,
      changedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to review verification:", error);
    throw error;
  }
}

/**
 * Get verification detail
 */
export async function getVerificationDetail(verificationId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Database not available");
  }

  try {
    const { teacherVerifications, teacherProfiles, verificationHistory, users } = await import("../drizzle/schema");
    
    const verification = await db
      .select()
      .from(teacherVerifications)
      .where(eq(teacherVerifications.id, verificationId))
      .limit(1);

    if (!verification.length) {
      throw new Error("Verification not found");
    }

    const history = await db
      .select()
      .from(verificationHistory)
      .where(eq(verificationHistory.verificationId, verificationId))
      .orderBy(desc(verificationHistory.changedAt));

    return {
      ...verification[0],
      history,
    };
  } catch (error) {
    console.error("[Database] Failed to get verification detail:", error);
    throw error;
  }
}

/**
 * Delete a verification
 */
export async function deleteVerification(verificationId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Database not available");
  }

  try {
    const { teacherVerifications, verificationHistory } = await import("../drizzle/schema");
    
    // Delete history first
    await db
      .delete(verificationHistory)
      .where(eq(verificationHistory.verificationId, verificationId));

    // Delete verification
    await db
      .delete(teacherVerifications)
      .where(eq(teacherVerifications.id, verificationId));

    return { success: true };
  } catch (error) {
    console.error("[Database] Failed to delete verification:", error);
    throw error;
  }
}

/**
 * Get verification types
 */
export async function getVerificationTypes() {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Database not available");
  }

  try {
    const { verificationTypes } = await import("../drizzle/schema");
    const result = await db
      .select()
      .from(verificationTypes)
      .orderBy(asc(verificationTypes.sortOrder));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get verification types:", error);
    throw error;
  }
}

/**
 * Create verification type
 */
export async function createVerificationType(data: {
  name: string;
  description?: string;
  isRequired?: boolean;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Database not available");
  }

  try {
    const { verificationTypes } = await import("../drizzle/schema");
    const result = await db.insert(verificationTypes).values({
      name: data.name,
      description: data.description,
      isRequired: data.isRequired || false,
    });
    return result;
  } catch (error) {
    console.error("[Database] Failed to create verification type:", error);
    throw error;
  }
}

// ============ TEACHER APPROVAL FUNCTIONS ============

/**
 * 獲取待審核師傅列表
 */
export async function getPendingTeachers(page: number = 1, limit: number = 10) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const offset = (page - 1) * limit;

  const [teachersData, totalData] = await Promise.all([
    db
      .select({
        id: teacherProfiles.id,
        userId: teacherProfiles.userId,
        displayName: teacherProfiles.displayName,
        title: teacherProfiles.title,
        bio: teacherProfiles.bio,
        avatarUrl: teacherProfiles.avatarUrl,
        region: teacherProfiles.region,
        contactEmail: teacherProfiles.contactEmail,
        contactPhone: teacherProfiles.contactPhone,
        status: teacherProfiles.status,
        submittedAt: teacherProfiles.submittedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(teacherProfiles)
      .innerJoin(users, eq(teacherProfiles.userId, users.id))
      .where(eq(teacherProfiles.status, 'pending'))
      .orderBy(desc(teacherProfiles.submittedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(teacherProfiles)
      .where(eq(teacherProfiles.status, 'pending'))
  ]);

  const total = totalData[0]?.count ?? 0;

  return {
    teachers: teachersData,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 批准師傅申請
 */
export async function approveTeacher(teacherId: number, approvedBy: number, approvalNotes?: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 更新師傅狀態
  await db
    .update(teacherProfiles)
    .set({
      status: 'approved',
      approvedAt: new Date(),
      approvedBy,
    })
    .where(eq(teacherProfiles.id, teacherId));

  // 記錄審核歷史
  await db.insert(teacherApprovalHistory).values({
    teacherProfileId: teacherId,
    status: 'approved',
    reviewedBy: approvedBy,
    reviewNotes: approvalNotes,
  });

  return { success: true };
}

/**
 * 拒絕師傅申請
 */
export async function rejectTeacher(teacherId: number, reviewedBy: number, rejectionReason: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 更新師傅狀態
  await db
    .update(teacherProfiles)
    .set({
      status: 'rejected',
      rejectionReason,
    })
    .where(eq(teacherProfiles.id, teacherId));

  // 記錄審核歷史
  await db.insert(teacherApprovalHistory).values({
    teacherProfileId: teacherId,
    status: 'rejected',
    reviewedBy,
    reviewNotes: rejectionReason,
  });

  return { success: true };
}

/**
 * 獲取師傅審核狀態
 */
export async function getTeacherApprovalStatus(userId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const profile = await db
    .select({
      status: teacherProfiles.status,
      rejectionReason: teacherProfiles.rejectionReason,
      approvedAt: teacherProfiles.approvedAt,
      submittedAt: teacherProfiles.submittedAt,
    })
    .from(teacherProfiles)
    .where(eq(teacherProfiles.userId, userId))
    .limit(1);

  return profile[0] || null;
}

/**
 * 獲取師傅審核歷史
 */
export async function getTeacherApprovalHistory(teacherProfileId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const history = await db
    .select({
      id: teacherApprovalHistory.id,
      status: teacherApprovalHistory.status,
      reviewNotes: teacherApprovalHistory.reviewNotes,
      createdAt: teacherApprovalHistory.createdAt,
      reviewerName: users.name,
      reviewerEmail: users.email,
    })
    .from(teacherApprovalHistory)
    .innerJoin(users, eq(teacherApprovalHistory.reviewedBy, users.id))
    .where(eq(teacherApprovalHistory.teacherProfileId, teacherProfileId))
    .orderBy(desc(teacherApprovalHistory.createdAt));

  return history;
}

// ============ GOOGLE CALENDAR FUNCTIONS ============

/**
 * 創建 Google Calendar 令牌
 */
export async function createGoogleCalendarToken(token: InsertGoogleCalendarToken) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db.insert(googleCalendarTokens).values(token);
}

/**
 * 獲取 Google Calendar 令牌
 */
export async function getGoogleCalendarToken(teacherProfileId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.teacherProfileId, teacherProfileId))
    .limit(1);

  return result[0] || null;
}

/**
 * 更新 Google Calendar 令牌
 */
export async function updateGoogleCalendarToken(
  teacherProfileId: number,
  updates: Partial<Omit<GoogleCalendarToken, 'id' | 'teacherProfileId'>>
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(googleCalendarTokens)
    .set(updates)
    .where(eq(googleCalendarTokens.teacherProfileId, teacherProfileId));
}

/**
 * 刪除 Google Calendar 令牌
 */
export async function deleteGoogleCalendarToken(teacherProfileId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .delete(googleCalendarTokens)
    .where(eq(googleCalendarTokens.teacherProfileId, teacherProfileId));
}

/**
 * 創建忙碌時段（批量）
 */
export async function createGoogleCalendarBusySlots(slots: InsertGoogleCalendarBusySlot[]) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  if (slots.length > 0) {
    await db.insert(googleCalendarBusySlots).values(slots);
  }
}

/**
 * 獲取忙碌時段
 */
export async function getGoogleCalendarBusySlots(
  teacherProfileId: number,
  startTime: Date,
  endTime: Date
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(googleCalendarBusySlots)
    .where(
      and(
        eq(googleCalendarBusySlots.teacherProfileId, teacherProfileId),
        lte(googleCalendarBusySlots.startTime, endTime),
        gte(googleCalendarBusySlots.endTime, startTime)
      )
    )
    .orderBy(asc(googleCalendarBusySlots.startTime));

  return result;
}

/**
 * 刪除師傅的所有忙碌時段
 */
export async function deleteGoogleCalendarBusySlots(teacherProfileId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .delete(googleCalendarBusySlots)
    .where(eq(googleCalendarBusySlots.teacherProfileId, teacherProfileId));
}

/**
 * 獲取所有活躍的 Google Calendar 連接
 */
export async function getAllActiveGoogleCalendarTokens() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.isActive, true));

  return result;
}

