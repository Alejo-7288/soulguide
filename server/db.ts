import { eq, and, desc, asc, like, or, sql, inArray } from "drizzle-orm";
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
  favorites, Favorite, InsertFavorite
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
      values.role = 'admin';
      updateSet.role = 'admin';
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

  // Apply filters
  const conditions = [eq(teacherProfiles.isActive, true)];
  
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
