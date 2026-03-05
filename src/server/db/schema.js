import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  varchar,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const appRoleEnum = pgEnum("app_role", ["owner", "admin"]);
export const phase1StatusEnum = pgEnum("phase1_status", ["pending", "rejected", "moved_to_phase2"]);
export const phase1RejectReasonEnum = pgEnum("phase1_reject_reason", ["bad_accent", "bad_pronunciation", "low_energy"]);
export const phase2TaskStatusEnum = pgEnum("phase2_task_status", ["assigned", "submitted", "accepted", "retry", "rejected"]);
export const phase2SubmissionStatusEnum = pgEnum("phase2_submission_status", ["submitted", "accepted", "retry", "rejected"]);
export const notificationTypeEnum = pgEnum("notification_type", ["info", "phase1", "phase2", "system", "referral"]);
export const trainingVideoCategoryEnum = pgEnum("training_video_category", ["about_us", "bright_sample", "tips"]);
export const referralRewardStatusEnum = pgEnum("referral_reward_status", ["pending", "approved", "paid"]);

export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id").primaryKey(),
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone"),
    dateOfBirth: date("date_of_birth"),
    age: integer("age"),
    shortAbout: varchar("short_about", { length: 50 }),
    referralCode: text("referral_code").notNull().unique(),
    referredByCode: text("referred_by_code"),
    currentPhase: text("current_phase").notNull().default("phase1"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    idxProfilesCurrentPhase: index("idx_profiles_current_phase").on(table.currentPhase),
    idxProfilesCreatedAt: index("idx_profiles_created_at").on(table.createdAt),
    uqProfilesEmail: unique("uq_profiles_email").on(table.email),
  }),
);

export const adminUsers = pgTable(
  "admin_users",
  {
    userId: text("user_id").primaryKey().references(() => profiles.userId, { onDelete: "cascade" }),
    role: appRoleEnum("role").notNull().default("admin"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    idxAdminUsersRole: index("idx_admin_users_role").on(table.role),
  }),
);

export const teacherPhase1Submissions = pgTable(
  "teacher_phase1_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => profiles.userId, { onDelete: "cascade" }),
    attemptNo: smallint("attempt_no").notNull(),
    videoBlobKey: text("video_blob_key").notNull(),
    videoBlobUrl: text("video_blob_url").notNull(),
    scriptText: text("script_text").notNull().default("Please introduce yourself in 4-5 sentences."),
    status: phase1StatusEnum("status").notNull().default("pending"),
    rejectReason: phase1RejectReasonEnum("reject_reason"),
    adminNotes: text("admin_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    storageDeletedAt: timestamp("storage_deleted_at", { withTimezone: true }),
  },
  (table) => ({
    uqPhase1UserAttempt: unique("uq_phase1_user_attempt").on(table.userId, table.attemptNo),
    idxPhase1UserCreated: index("idx_phase1_user_created").on(table.userId, table.createdAt),
    idxPhase1StatusCreated: index("idx_phase1_status_created").on(table.status, table.createdAt),
    idxPhase1StatusDeletedCreated: index("idx_phase1_status_deleted_created").on(table.status, table.isDeleted, table.createdAt),
  }),
);

export const teacherPhase2Tasks = pgTable(
  "teacher_phase2_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().unique().references(() => profiles.userId, { onDelete: "cascade" }),
    phase2Sentence: text("phase2_sentence").notNull(),
    status: phase2TaskStatusEnum("status").notNull().default("assigned"),
    attemptsAllowed: smallint("attempts_allowed").notNull().default(3),
    currentAttempts: smallint("current_attempts").notNull().default(0),
    lastFeedback: text("last_feedback"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdBy: text("created_by"),
  },
  (table) => ({
    idxPhase2TasksStatusUpdated: index("idx_phase2_tasks_status_updated").on(table.status, table.updatedAt),
  }),
);

export const teacherPhase2Submissions = pgTable(
  "teacher_phase2_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id").notNull().references(() => teacherPhase2Tasks.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => profiles.userId, { onDelete: "cascade" }),
    attemptNo: smallint("attempt_no").notNull(),
    videoBlobKey: text("video_blob_key").notNull(),
    videoBlobUrl: text("video_blob_url").notNull(),
    status: phase2SubmissionStatusEnum("status").notNull().default("submitted"),
    feedback: text("feedback"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    storageDeletedAt: timestamp("storage_deleted_at", { withTimezone: true }),
  },
  (table) => ({
    uqPhase2TaskAttempt: unique("uq_phase2_task_attempt").on(table.taskId, table.attemptNo),
    idxPhase2SubTaskCreated: index("idx_phase2_submissions_task_created").on(table.taskId, table.createdAt),
    idxPhase2SubUserCreated: index("idx_phase2_submissions_user_created").on(table.userId, table.createdAt),
    idxPhase2SubTaskDeletedAttempt: index("idx_phase2_submissions_task_deleted_attempt").on(
      table.taskId,
      table.isDeleted,
      table.attemptNo,
    ),
  }),
);

export const trainingVideos = pgTable(
  "training_videos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    category: trainingVideoCategoryEnum("category").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    storageBlobKey: text("storage_blob_key").notNull(),
    storageBlobUrl: text("storage_blob_url").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by"),
  },
  (table) => ({
    idxTrainingActiveOrder: index("idx_training_videos_active_order").on(table.isActive, table.category, table.orderIndex),
  }),
);

export const teacherTrainingVideoViews = pgTable(
  "teacher_training_video_views",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => profiles.userId, { onDelete: "cascade" }),
    trainingVideoId: uuid("training_video_id").notNull().references(() => trainingVideos.id, { onDelete: "cascade" }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqTrainingViewsUserVideo: unique("uq_training_views_user_video").on(table.userId, table.trainingVideoId),
    idxTrainingViewsUser: index("idx_training_video_views_user").on(table.userId, table.viewedAt),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => profiles.userId, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull().default("info"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => ({
    idxNotificationsUserUnread: index("idx_notifications_user_unread").on(table.userId, table.isRead, table.createdAt),
  }),
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: text("session_id").notNull(),
    userId: text("user_id"),
    eventName: text("event_name").notNull(),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    idxAnalyticsEventNameCreated: index("idx_analytics_event_name_created").on(table.eventName, table.createdAt),
    idxAnalyticsSessionCreated: index("idx_analytics_session_created").on(table.sessionId, table.createdAt),
  }),
);

export const referralLinks = pgTable(
  "referral_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    referrerId: text("referrer_id").notNull().references(() => profiles.userId, { onDelete: "cascade" }),
    referredId: text("referred_id").notNull().unique().references(() => profiles.userId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqReferralLinkPair: unique("uq_referral_links_pair").on(table.referrerId, table.referredId),
    idxReferralLinksReferrer: index("idx_referral_links_referrer").on(table.referrerId),
  }),
);

export const referralRewards = pgTable(
  "referral_rewards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    referrerId: text("referrer_id").notNull().references(() => profiles.userId, { onDelete: "cascade" }),
    referredId: text("referred_id").notNull().unique().references(() => profiles.userId, { onDelete: "cascade" }),
    amountEur: numeric("amount_eur", { precision: 10, scale: 2 }).notNull().default("20.00"),
    status: referralRewardStatusEnum("status").notNull().default("pending"),
    eligibleAt: timestamp("eligible_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by"),
  },
  (table) => ({
    idxReferralRewardsStatus: index("idx_referral_rewards_status").on(table.status, table.eligibleAt),
  }),
);

export const showcaseVideos = pgTable(
  "showcase_videos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    source: text("source").notNull().default("youtube"),
    youtubeUrl: text("youtube_url"),
    youtubeVideoId: text("youtube_video_id"),
    thumbnailUrl: text("thumbnail_url"),
    storageBlobKey: text("storage_blob_key"),
    storageBlobUrl: text("storage_blob_url"),
    orderIndex: integer("order_index").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by"),
  },
  (table) => ({
    idxShowcaseVideosActiveOrder: index("idx_showcase_videos_active_order").on(table.isActive, table.orderIndex, table.createdAt),
  }),
);
