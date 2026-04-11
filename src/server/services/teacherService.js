import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/src/server/db/client";
import {
  profiles,
  showcaseVideos,
  teacherPhase1Submissions,
  teacherPhase2Submissions,
  teacherPhase2Tasks,
  teacherTrainingVideoViews,
  trainingVideos,
} from "@/src/server/db/schema";
import { ApiError, requireEmail, requireNonEmptyString } from "@/src/server/http/errors";
import { createNotification, listNotificationsForUser } from "@/src/server/services/notificationService";
import { createAnalyticsEvent } from "@/src/server/services/analyticsService";
import { removeBlobSafe } from "@/src/server/services/storageService";
import { listRewardsForUser } from "@/src/server/services/referralService";
import { generateUniqueReferralCode, getProfile, listAdminProfiles } from "@/src/server/services/authService";
import { sendEmail } from "@/src/server/services/emailService";
import { PHASE1_SHARED_SCRIPT_TEXT } from "@/src/config/phaseTexts";

const MAX_PHASE1_ATTEMPTS = 3;

const normalizeEmailList = (raw = "") =>
  String(raw)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item));

const buildCandidateDisplayName = ({ firstName, lastName, fallbackEmail }) => {
  const parsed = [firstName, lastName].map((item) => String(item || "").trim()).filter(Boolean).join(" ");
  if (parsed) return parsed;
  return fallbackEmail || "Kandidat";
};

const notifyAdminsAboutPhase1Submission = async ({ userId, candidateName, candidateEmail, submissionId, attemptNo }) => {
  const admins = await listAdminProfiles();
  const fallbackAdminEmails = normalizeEmailList(process.env.ADMIN_ALERT_EMAILS || process.env.ADMIN_SEED_EMAILS || "");
  const adminEmails = [...new Set([...admins.map((admin) => (admin.email || "").toLowerCase()).filter(Boolean), ...fallbackAdminEmails])];

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin.user_id,
        type: "phase1",
        title: "Nova Phase 1 prijava",
        body: `${candidateName} je poslao novu prijavu za Phase 1 (pokusaj ${attemptNo}).`,
        payload: {
          candidate_user_id: userId,
          candidate_email: candidateEmail,
          submission_id: submissionId,
          attempt_no: attemptNo,
        },
      }),
    ),
  );

  await Promise.all(
    adminEmails.map((to) =>
      sendEmail({
        to,
        subject: `Nova Phase 1 prijava - ${candidateName}`,
        text: `Novi teacher kandidat je poslao Phase 1 prijavu.\n\nKandidat: ${candidateName}\nEmail: ${candidateEmail}\nPokusaj: ${attemptNo}\nSubmission ID: ${submissionId}\n\nProveri admin panel (/admin/phase1).`,
      }),
    ),
  );
};

const mapPhase1Row = (row) => ({
  id: row.id,
  user_id: row.userId,
  attempt_no: row.attemptNo,
  video_blob_key: row.videoBlobKey,
  video_blob_url: row.videoBlobUrl,
  script_text: row.scriptText,
  status: row.status,
  reject_reason: row.rejectReason,
  admin_notes: row.adminNotes,
  created_at: row.createdAt,
  reviewed_at: row.reviewedAt,
  reviewed_by: row.reviewedBy,
  is_deleted: row.isDeleted,
});

const mapPhase2Task = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.userId,
    phase2_sentence: row.phase2Sentence,
    status: row.status,
    attempts_allowed: row.attemptsAllowed,
    current_attempts: row.currentAttempts,
    last_feedback: row.lastFeedback,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    closed_at: row.closedAt,
  };
};

const mapPhase2Submission = (row) => ({
  id: row.id,
  task_id: row.taskId,
  user_id: row.userId,
  attempt_no: row.attemptNo,
  video_blob_key: row.videoBlobKey,
  video_blob_url: row.videoBlobUrl,
  status: row.status,
  feedback: row.feedback,
  created_at: row.createdAt,
  reviewed_at: row.reviewedAt,
  reviewed_by: row.reviewedBy,
  is_deleted: row.isDeleted,
});

const mapTrainingVideo = (row) => ({
  id: row.id,
  title: row.title,
  category: row.category,
  order_index: row.orderIndex,
  storage_blob_key: row.storageBlobKey,
  storage_blob_url: row.storageBlobUrl,
  is_active: row.isActive,
  created_at: row.createdAt,
  updated_at: row.updatedAt,
});

const mapShowcaseVideo = (row) => ({
  id: row.id,
  source: row.source || (row.storageBlobUrl ? "native" : "youtube"),
  title: row.title,
  youtube_url: row.youtubeUrl,
  youtube_video_id: row.youtubeVideoId,
  thumbnail_url: row.thumbnailUrl,
  storage_blob_key: row.storageBlobKey,
  storage_blob_url: row.storageBlobUrl,
  order_index: row.orderIndex,
  is_active: row.isActive,
  created_at: row.createdAt,
});

export const getTeacherDashboardData = async (userId) => {
  const [phase1Attempts, phase2TaskRows, profileRows] = await Promise.all([
    db
      .select()
      .from(teacherPhase1Submissions)
      .where(eq(teacherPhase1Submissions.userId, userId))
      .orderBy(asc(teacherPhase1Submissions.attemptNo)),
    db.select().from(teacherPhase2Tasks).where(eq(teacherPhase2Tasks.userId, userId)).limit(1),
    db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
  ]);

  const unreadCount = await db.execute(sql`select count(*)::int as count from notifications where user_id = ${userId} and is_read = false`);
  const profile = profileRows[0] || null;

  return {
    profile: profile
      ? {
          user_id: profile.userId,
          email: profile.email,
          first_name: profile.firstName,
          last_name: profile.lastName,
          phone: profile.phone,
          date_of_birth: profile.dateOfBirth,
          short_about: profile.shortAbout,
          referral_code: profile.referralCode,
          referred_by_code: profile.referredByCode,
          current_phase: profile.currentPhase,
          created_at: profile.createdAt,
        }
      : null,
    phase1Attempts: phase1Attempts.map(mapPhase1Row),
    phase2Task: mapPhase2Task(phase2TaskRows[0] || null),
    unreadCount: Number(unreadCount.rows?.[0]?.count || 0),
  };
};

export const getTeacherPhase1Data = async (userId) => {
  const [attemptRows, profileRows] = await Promise.all([
    db
      .select()
      .from(teacherPhase1Submissions)
      .where(eq(teacherPhase1Submissions.userId, userId))
      .orderBy(asc(teacherPhase1Submissions.attemptNo)),
    db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
  ]);

  return {
    profile: profileRows[0] || null,
    attempts: attemptRows.map(mapPhase1Row),
  };
};

export const submitTeacherPhase1 = async ({
  userId,
  authEmail,
  firstName,
  lastName,
  dateOfBirth,
  phone,
  email,
  shortAbout,
  videoBlobKey,
  videoBlobUrl,
  sessionId,
}) => {
  const normalizedEmail = requireEmail(email);
  if (normalizedEmail !== requireEmail(authEmail || "")) {
    throw new ApiError(400, "email must match auth user email");
  }

  if (typeof shortAbout === "string" && shortAbout.length > 50) {
    throw new ApiError(400, "short_about must be <= 50 characters");
  }

  const existingAttempts = await db
    .select()
    .from(teacherPhase1Submissions)
    .where(eq(teacherPhase1Submissions.userId, userId))
    .orderBy(asc(teacherPhase1Submissions.attemptNo));

  const pendingExists = existingAttempts.some((row) => row.status === "pending");
  const passed = existingAttempts.some((row) => row.status === "moved_to_phase2");

  if (pendingExists) {
    throw new ApiError(409, "You already have a pending Phase 1 submission");
  }

  if (passed) {
    throw new ApiError(409, "You already passed Phase 1");
  }

  if (existingAttempts.length >= MAX_PHASE1_ATTEMPTS) {
    throw new ApiError(400, "Maximum 3 Phase 1 attempts reached");
  }

  const nextAttempt = existingAttempts.length + 1;

  const currentProfile = await getProfile(userId);
  if (!currentProfile) {
    const referralCode = await generateUniqueReferralCode();
    await db.insert(profiles).values({
      userId,
      email: normalizedEmail,
      firstName: requireNonEmptyString(firstName, "first_name"),
      lastName: requireNonEmptyString(lastName, "last_name"),
      phone: requireNonEmptyString(phone, "phone"),
      dateOfBirth: requireNonEmptyString(dateOfBirth, "date_of_birth"),
      shortAbout: shortAbout || "",
      currentPhase: "phase1",
      referralCode,
    });
  } else {
    await db
      .update(profiles)
      .set({
        email: normalizedEmail,
        firstName: requireNonEmptyString(firstName, "first_name"),
        lastName: requireNonEmptyString(lastName, "last_name"),
        phone: requireNonEmptyString(phone, "phone"),
        dateOfBirth: requireNonEmptyString(dateOfBirth, "date_of_birth"),
        shortAbout: shortAbout || "",
        currentPhase: "phase1",
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));
  }

  // Keep only latest Phase 1 blob: soft-delete all previous rows and remove old blob files.
  for (const row of existingAttempts) {
    if (!row.videoBlobUrl) continue;
    await removeBlobSafe(row.videoBlobUrl);
  }

  if (existingAttempts.length) {
    await db
      .update(teacherPhase1Submissions)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        storageDeletedAt: new Date(),
      })
      .where(and(eq(teacherPhase1Submissions.userId, userId), eq(teacherPhase1Submissions.isDeleted, false)));
  }

  const [submission] = await db
    .insert(teacherPhase1Submissions)
    .values({
      userId,
      attemptNo: nextAttempt,
      videoBlobKey: requireNonEmptyString(videoBlobKey, "video_blob_key"),
      videoBlobUrl: requireNonEmptyString(videoBlobUrl, "video_blob_url"),
      scriptText: PHASE1_SHARED_SCRIPT_TEXT,
      status: "pending",
    })
    .returning();

  await createNotification({
    userId,
    type: "phase1",
    title: "Phase 1 submitted",
    body: "Your Phase 1 application has been submitted and is pending review.",
    payload: {
      submission_id: submission.id,
      attempt_no: nextAttempt,
    },
  });

  if (nextAttempt === 1) {
    try {
      const candidateName = buildCandidateDisplayName({
        firstName: requireNonEmptyString(firstName, "first_name"),
        lastName: requireNonEmptyString(lastName, "last_name"),
        fallbackEmail: normalizedEmail,
      });

      await notifyAdminsAboutPhase1Submission({
        userId,
        candidateName,
        candidateEmail: normalizedEmail,
        submissionId: submission.id,
        attemptNo: nextAttempt,
      });
    } catch (notifyError) {
      console.warn("notifyAdminsAboutPhase1Submission failed", notifyError?.message || notifyError);
    }
  }

  if (sessionId) {
    await createAnalyticsEvent({
      sessionId,
      userId,
      eventName: "phase1_submitted",
      metadata: { attempt_no: nextAttempt },
    });
  }

  return {
    submission: mapPhase1Row(submission),
  };
};

export const getTeacherPhase2Data = async (userId) => {
  return {
    task: null,
    submissions: [],
    trainingVideos: [],
    showcaseVideos: [],
  };

  const [taskRows, submissions, videos, showcase] = await Promise.all([
    db.select().from(teacherPhase2Tasks).where(eq(teacherPhase2Tasks.userId, userId)).limit(1),
    db
      .select()
      .from(teacherPhase2Submissions)
      .where(eq(teacherPhase2Submissions.userId, userId))
      .orderBy(asc(teacherPhase2Submissions.attemptNo)),
    db
      .select()
      .from(trainingVideos)
      .where(eq(trainingVideos.isActive, true))
      .orderBy(asc(trainingVideos.category), asc(trainingVideos.orderIndex)),
    db
      .select()
      .from(showcaseVideos)
      .where(eq(showcaseVideos.isActive, true))
      .orderBy(asc(showcaseVideos.orderIndex), desc(showcaseVideos.createdAt)),
  ]);

  return {
    task: mapPhase2Task(taskRows[0] || null),
    submissions: submissions.map(mapPhase2Submission),
    trainingVideos: videos.map(mapTrainingVideo),
    showcaseVideos: showcase.map(mapShowcaseVideo),
  };
};

export const submitTeacherPhase2 = async ({ userId, taskId, videoBlobKey, videoBlobUrl, sessionId }) => {
  throw new ApiError(410, "Phase 2 is no longer part of the application flow");

  const [task] = await db
    .select()
    .from(teacherPhase2Tasks)
    .where(and(eq(teacherPhase2Tasks.id, taskId), eq(teacherPhase2Tasks.userId, userId)))
    .limit(1);

  if (!task) {
    throw new ApiError(404, "Phase 2 task not found");
  }

  if (["accepted", "rejected"].includes(task.status)) {
    throw new ApiError(400, "Task is already closed");
  }

  if (task.status === "submitted") {
    throw new ApiError(409, "Current submission is still pending review");
  }

  if ((task.currentAttempts || 0) >= (task.attemptsAllowed || 3)) {
    throw new ApiError(400, "Maximum Phase 2 attempts reached");
  }

  const submissionRows = await db
    .select()
    .from(teacherPhase2Submissions)
    .where(eq(teacherPhase2Submissions.taskId, task.id))
    .orderBy(asc(teacherPhase2Submissions.attemptNo));

  const nextAttempt = submissionRows.length + 1;
  if (nextAttempt > task.attemptsAllowed) {
    throw new ApiError(400, "Maximum Phase 2 attempts reached");
  }

  const [submission] = await db
    .insert(teacherPhase2Submissions)
    .values({
      taskId: task.id,
      userId,
      attemptNo: nextAttempt,
      videoBlobKey: requireNonEmptyString(videoBlobKey, "video_blob_key"),
      videoBlobUrl: requireNonEmptyString(videoBlobUrl, "video_blob_url"),
      status: "submitted",
    })
    .returning();

  await db
    .update(teacherPhase2Tasks)
    .set({
      status: "submitted",
      currentAttempts: nextAttempt,
      updatedAt: new Date(),
    })
    .where(eq(teacherPhase2Tasks.id, task.id));

  await createNotification({
    userId,
    type: "phase2",
    title: "Phase 2 submitted",
    body: "Your Phase 2 video has been submitted and is pending admin review.",
    payload: {
      task_id: task.id,
      submission_id: submission.id,
      attempt_no: nextAttempt,
    },
  });

  if (sessionId) {
    await createAnalyticsEvent({
      sessionId,
      userId,
      eventName: "phase2_submitted",
      metadata: { attempt_no: nextAttempt },
    });
  }

  return {
    submission: mapPhase2Submission(submission),
  };
};

export const markTrainingVideoViewed = async ({ userId, trainingVideoId }) => {
  await db
    .insert(teacherTrainingVideoViews)
    .values({
      userId,
      trainingVideoId,
    })
    .onConflictDoUpdate({
      target: [teacherTrainingVideoViews.userId, teacherTrainingVideoViews.trainingVideoId],
      set: {
        viewedAt: new Date(),
      },
    });
};

export const getTeacherProfileData = async (userId) => {
  const [profileRows, rewards, notifications] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
    listRewardsForUser(userId),
    listNotificationsForUser(userId),
  ]);

  return {
    profile: profileRows[0] || null,
    rewards,
    notifications,
  };
};

export const updateTeacherProfileData = async ({ userId, email, payload }) => {
  const normalizedEmail = requireEmail(email || "");
  const current = await getProfile(userId);

  if (!current) {
    const referralCode = await generateUniqueReferralCode();
    await db.insert(profiles).values({
      userId,
      email: normalizedEmail,
      firstName: payload.first_name || null,
      lastName: payload.last_name || null,
      phone: payload.phone || null,
      dateOfBirth: payload.date_of_birth || null,
      shortAbout: payload.short_about || "",
      referralCode,
      currentPhase: "phase1",
      updatedAt: new Date(),
    });
  } else {
    await db
      .update(profiles)
      .set({
        email: normalizedEmail,
        firstName: payload.first_name || null,
        lastName: payload.last_name || null,
        phone: payload.phone || null,
        dateOfBirth: payload.date_of_birth || null,
        shortAbout: payload.short_about || "",
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));
  }

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return profile || null;
};
