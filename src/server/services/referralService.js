import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/src/server/db/client";
import { profiles, referralLinks, referralRewards } from "@/src/server/db/schema";
import { ApiError, requireNonEmptyString } from "@/src/server/http/errors";

export const applyReferralCode = async ({ userId, referralCode }) => {
  const code = requireNonEmptyString(referralCode, "referral_code").toUpperCase();

  const [currentProfile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!currentProfile) {
    throw new ApiError(404, "Profile not found");
  }

  if (currentProfile.referredByCode) {
    throw new ApiError(409, "Referral code already applied");
  }

  const [referrerProfile] = await db.select().from(profiles).where(eq(profiles.referralCode, code)).limit(1);
  if (!referrerProfile) {
    throw new ApiError(404, "Referral code does not exist");
  }

  if (referrerProfile.userId === userId) {
    throw new ApiError(400, "You cannot use your own referral code");
  }

  await db
    .update(profiles)
    .set({
      referredByCode: code,
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, userId));

  await db
    .insert(referralLinks)
    .values({
      referrerId: referrerProfile.userId,
      referredId: userId,
    })
    .onConflictDoNothing();

  const links = await db
    .select()
    .from(referralLinks)
    .where(and(eq(referralLinks.referrerId, referrerProfile.userId), eq(referralLinks.referredId, userId)))
    .limit(1);

  return links[0] || null;
};

export const markReferralEligible = async ({ referredUserId, eligibleAt = null, createdBy = null }) => {
  const [referredProfile] = await db.select().from(profiles).where(eq(profiles.userId, referredUserId)).limit(1);
  if (!referredProfile) {
    throw new ApiError(404, "Referred profile not found");
  }

  if (referredProfile.currentPhase !== "accepted") {
    throw new ApiError(409, "Referred candidate must be accepted before referral reward is eligible");
  }

  const [link] = await db.select().from(referralLinks).where(eq(referralLinks.referredId, referredUserId)).limit(1);
  if (!link) {
    throw new ApiError(404, "Referral link not found for this user");
  }

  const timestamp = eligibleAt ? new Date(eligibleAt) : new Date();

  await db
    .insert(referralRewards)
    .values({
      referrerId: link.referrerId,
      referredId: link.referredId,
      status: "pending",
      eligibleAt: timestamp,
      createdBy,
    })
    .onConflictDoUpdate({
      target: referralRewards.referredId,
      set: {
        referrerId: link.referrerId,
        status: "pending",
        eligibleAt: timestamp,
        updatedAt: new Date(),
        createdBy,
      },
    });

  const [reward] = await db.select().from(referralRewards).where(eq(referralRewards.referredId, referredUserId)).limit(1);
  return reward || null;
};

export const approveReferralReward = async ({ rewardId }) => {
  const id = requireNonEmptyString(rewardId, "reward_id");

  const [reward] = await db.select().from(referralRewards).where(eq(referralRewards.id, id)).limit(1);
  if (!reward) {
    throw new ApiError(404, "Reward not found");
  }

  if (reward.status !== "pending") {
    throw new ApiError(409, "Only pending rewards can be approved");
  }

  await db
    .update(referralRewards)
    .set({
      status: "approved",
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(referralRewards.id, id));

  const [updated] = await db.select().from(referralRewards).where(eq(referralRewards.id, id)).limit(1);
  return updated || null;
};

export const listRewardsForUser = async (userId) => {
  return db
    .select()
    .from(referralRewards)
    .where(or(eq(referralRewards.referrerId, userId), eq(referralRewards.referredId, userId)))
    .orderBy(desc(referralRewards.createdAt));
};

export const listAllRewards = async () => {
  return db.select().from(referralRewards).orderBy(desc(referralRewards.createdAt));
};
