import { randomBytes } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/src/server/db/client";
import { adminUsers, profiles } from "@/src/server/db/schema";
import { ApiError, requireEmail } from "@/src/server/http/errors";

const DEFAULT_ADMIN_EMAILS = ["milos93tutor@gmail.com", "web.wise018@gmail.com"];
const OWNER_EMAIL = "milos93tutor@gmail.com";

const normalizeAdminEmailSet = () => {
  const configured = (process.env.ADMIN_SEED_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return new Set([...(configured.length ? configured : DEFAULT_ADMIN_EMAILS)]);
};

const roleForEmail = (email) => (email === OWNER_EMAIL ? "owner" : "admin");

export const ensureAdminRoleForUser = async ({ userId, email }) => {
  if (!userId || !email) return false;

  const normalizedEmail = requireEmail(email);
  const adminEmailSet = normalizeAdminEmailSet();
  if (!adminEmailSet.has(normalizedEmail)) return false;

  await db
    .insert(adminUsers)
    .values({
      userId,
      role: roleForEmail(normalizedEmail),
    })
    .onConflictDoUpdate({
      target: adminUsers.userId,
      set: {
        role: roleForEmail(normalizedEmail),
      },
    });

  return true;
};

const buildReferralCode = () => randomBytes(6).toString("hex").slice(0, 10).toUpperCase();

export const generateUniqueReferralCode = async () => {
  for (let i = 0; i < 12; i += 1) {
    const candidate = buildReferralCode();
    const existing = await db
      .select({ code: profiles.referralCode })
      .from(profiles)
      .where(eq(profiles.referralCode, candidate))
      .limit(1);

    if (!existing.length) {
      return candidate;
    }
  }

  throw new ApiError(500, "Failed to generate referral code");
};

const splitName = (name) => {
  if (!name || typeof name !== "string") {
    return { firstName: null, lastName: null };
  }

  const chunks = name.trim().split(/\s+/);
  if (!chunks.length) {
    return { firstName: null, lastName: null };
  }

  const firstName = chunks.shift() || null;
  const lastName = chunks.length ? chunks.join(" ") : null;
  return { firstName, lastName };
};

export const upsertProfileOnLogin = async ({ userId, email, name }) => {
  const normalizedEmail = requireEmail(email);
  const { firstName, lastName } = splitName(name);

  const current = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);

  if (!current.length) {
    const referralCode = await generateUniqueReferralCode();
    await db.insert(profiles).values({
      userId,
      email: normalizedEmail,
      firstName,
      lastName,
      referralCode,
      currentPhase: "phase1",
    });
  } else {
    await db
      .update(profiles)
      .set({
        email: normalizedEmail,
        firstName: current[0].firstName || firstName,
        lastName: current[0].lastName || lastName,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));
  }

  await ensureAdminRoleForUser({ userId, email: normalizedEmail });
};

export const isAdminUser = async (userId) => {
  if (!userId) return false;
  const rows = await db.select({ userId: adminUsers.userId }).from(adminUsers).where(eq(adminUsers.userId, userId)).limit(1);
  if (rows.length > 0) return true;

  // Backfill admin_users row when profile email belongs to predefined admin set.
  const profileRows = await db.select({ email: profiles.email }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const email = profileRows[0]?.email || null;
  if (!email) return false;

  const granted = await ensureAdminRoleForUser({ userId, email });
  return granted;
};

export const getProfile = async (userId) => {
  const rows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return rows[0] || null;
};

export const mapPublicProfile = (profile) => {
  if (!profile) return null;
  return {
    user_id: profile.userId,
    email: profile.email,
    first_name: profile.firstName,
    last_name: profile.lastName,
    phone: profile.phone,
    date_of_birth: profile.dateOfBirth,
    age: profile.age,
    short_about: profile.shortAbout,
    referral_code: profile.referralCode,
    referred_by_code: profile.referredByCode,
    current_phase: profile.currentPhase,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
};

export const getProfilesByUserIds = async (userIds) => {
  if (!userIds.length) return [];
  return db.select().from(profiles).where(inArray(profiles.userId, userIds));
};

export const assertSameAuthEmail = (inputEmail, authEmail) => {
  const normalizedInput = requireEmail(inputEmail);
  const normalizedAuth = requireEmail(authEmail || "");

  if (normalizedInput !== normalizedAuth) {
    throw new ApiError(400, "email must match auth user email");
  }

  return normalizedInput;
};

export const ensureProfileExists = async ({ userId, email, name = null }) => {
  const current = await getProfile(userId);
  if (current) return current;

  await upsertProfileOnLogin({ userId, email, name });
  const next = await getProfile(userId);
  if (!next) {
    throw new ApiError(500, "Failed to create profile");
  }

  return next;
};

export const setProfilePhase = async (userId, currentPhase) => {
  await db
    .update(profiles)
    .set({
      currentPhase,
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, userId));
};

export const updateProfileBase = async ({ userId, data }) => {
  await db
    .update(profiles)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, userId));

  return getProfile(userId);
};
