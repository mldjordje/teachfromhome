import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db } from "@/src/server/db/client";
import {
  analyticsEvents,
  profiles,
  referralRewards,
  showcaseVideos,
  teacherPhase1Submissions,
  teacherPhase2Submissions,
  teacherPhase2Tasks,
  trainingVideos,
} from "@/src/server/db/schema";
import { ApiError, parsePagination, requireAllowed, requireNonEmptyString } from "@/src/server/http/errors";
import { createAnalyticsEvent } from "@/src/server/services/analyticsService";
import { sendEmail } from "@/src/server/services/emailService";
import { createNotification } from "@/src/server/services/notificationService";
import { removeBlobSafe } from "@/src/server/services/storageService";
import { setProfilePhase } from "@/src/server/services/authService";

const trackedEvents = ["visits", "started_signup", "phase1_submitted", "phase1_passed", "phase2_submitted", "accepted"];

const mapPhase1 = (row) => ({
  submission_id: row.id,
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

const mapPhase2Task = (task, latestSubmission = null) => ({
  task_id: task.id,
  user_id: task.userId,
  phase2_sentence: task.phase2Sentence,
  task_status: task.status,
  attempts_allowed: task.attemptsAllowed,
  current_attempts: task.currentAttempts,
  last_feedback: task.lastFeedback,
  task_created_at: task.createdAt,
  task_updated_at: task.updatedAt,
  latest_submission_id: latestSubmission?.id || null,
  latest_attempt_no: latestSubmission?.attemptNo || null,
  latest_video_blob_key: latestSubmission?.videoBlobKey || null,
  latest_video_blob_url: latestSubmission?.videoBlobUrl || null,
  latest_submission_status: latestSubmission?.status || null,
  latest_submission_feedback: latestSubmission?.feedback || null,
  latest_submission_created_at: latestSubmission?.createdAt || null,
  latest_submission_reviewed_at: latestSubmission?.reviewedAt || null,
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
});

const mapShowcaseVideo = (row) => ({
  id: row.id,
  title: row.title,
  youtube_url: row.youtubeUrl,
  youtube_video_id: row.youtubeVideoId,
  thumbnail_url: row.thumbnailUrl,
  order_index: row.orderIndex,
  is_active: row.isActive,
  created_at: row.createdAt,
});

export const getAdminDashboardData = async () => {
  const [phase1Pending, phase2Pending, acceptedCount] = await Promise.all([
    db.execute(sql`select count(*)::int as count from teacher_phase1_submissions where status = 'pending' and is_deleted = false`),
    db.execute(sql`select count(*)::int as count from teacher_phase2_tasks where status in ('submitted','retry','assigned')`),
    db.execute(sql`select count(*)::int as count from profiles where current_phase = 'accepted'`),
  ]);

  const analyticsSummary = {};
  for (const eventName of trackedEvents) {
    const result = await db.execute(sql`select count(*)::int as count from analytics_events where event_name = ${eventName}`);
    analyticsSummary[eventName] = Number(result.rows?.[0]?.count || 0);
  }

  return {
    phase1Pending: Number(phase1Pending.rows?.[0]?.count || 0),
    phase2Pending: Number(phase2Pending.rows?.[0]?.count || 0),
    acceptedCount: Number(acceptedCount.rows?.[0]?.count || 0),
    analyticsSummary,
  };
};

export const listAdminPhase1Queue = async ({ status = "pending", page = 1, pageSize = 20 }) => {
  const filters = [eq(teacherPhase1Submissions.isDeleted, false)];
  if (status !== "all") {
    filters.push(eq(teacherPhase1Submissions.status, status));
  }

  const whereClause = and(...filters);

  const [items, countRows] = await Promise.all([
    db
      .select({
        submission: teacherPhase1Submissions,
        profile: profiles,
      })
      .from(teacherPhase1Submissions)
      .innerJoin(profiles, eq(profiles.userId, teacherPhase1Submissions.userId))
      .where(whereClause)
      .orderBy(desc(teacherPhase1Submissions.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql`count(*)::int` })
      .from(teacherPhase1Submissions)
      .where(whereClause),
  ]);

  const rows = items.map((item) => ({
    ...mapPhase1(item.submission),
    first_name: item.profile.firstName,
    last_name: item.profile.lastName,
    email: item.profile.email,
    phone: item.profile.phone,
  }));

  return {
    rows,
    page,
    pageSize,
    total: Number(countRows[0]?.count || 0),
    empty_reason:
      rows.length === 0
        ? status === "pending"
          ? "Nema kandidata na čekanju."
          : "Nema zapisa za izabrani status."
        : null,
  };
};

export const moveCandidateToPhase2 = async ({ adminUserId, userId, submissionId, phase2Sentence }) => {
  const sentence = requireNonEmptyString(phase2Sentence, "phase2_sentence");

  const [submission] = await db
    .select()
    .from(teacherPhase1Submissions)
    .where(
      and(
        eq(teacherPhase1Submissions.id, submissionId),
        eq(teacherPhase1Submissions.userId, userId),
        eq(teacherPhase1Submissions.isDeleted, false),
      ),
    )
    .limit(1);

  if (!submission) {
    throw new ApiError(404, "Phase 1 submission not found");
  }

  if (submission.status !== "pending") {
    throw new ApiError(409, "Only pending Phase 1 submissions can be moved to Phase 2");
  }

  const now = new Date();

  await db
    .update(teacherPhase1Submissions)
    .set({
      status: "moved_to_phase2",
      rejectReason: null,
      adminNotes: null,
      reviewedAt: now,
      reviewedBy: adminUserId,
    })
    .where(eq(teacherPhase1Submissions.id, submission.id));

  await db
    .insert(teacherPhase2Tasks)
    .values({
      userId,
      phase2Sentence: sentence,
      status: "assigned",
      attemptsAllowed: 3,
      currentAttempts: 0,
      lastFeedback: null,
      closedAt: null,
      createdBy: adminUserId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: teacherPhase2Tasks.userId,
      set: {
        phase2Sentence: sentence,
        status: "assigned",
        attemptsAllowed: 3,
        currentAttempts: 0,
        lastFeedback: null,
        closedAt: null,
        createdBy: adminUserId,
        updatedAt: now,
      },
    });

  await setProfilePhase(userId, "phase2");

  await createNotification({
    userId,
    type: "phase2",
    title: "Presli ste u fazu 2",
    body: "Postovani, hvala sto ste aplicirali. Presli ste u phase 2. Udjite u aplikaciju za sledeci korak.",
    payload: { submission_id: submission.id },
  });

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (profile?.email) {
    await sendEmail({
      to: profile.email,
      subject: "Presli ste u fazu 2",
      text: "Postovani, hvala sto ste aplicirali. Presli ste u phase 2. Udjite u aplikaciju za sledeci korak.",
    });
  }

  await createAnalyticsEvent({
    sessionId: `admin-${adminUserId}`,
    userId,
    eventName: "phase1_passed",
    metadata: {
      submission_id: submission.id,
      reviewed_by: adminUserId,
    },
  });

  return { ok: true };
};

export const rejectCandidatePhase1 = async ({ adminUserId, userId, submissionId, reason, notes = null }) => {
  const parsedReason = requireAllowed(reason, ["bad_accent", "bad_pronunciation", "low_energy"], "reason");

  const [submission] = await db
    .select()
    .from(teacherPhase1Submissions)
    .where(
      and(
        eq(teacherPhase1Submissions.id, submissionId),
        eq(teacherPhase1Submissions.userId, userId),
        eq(teacherPhase1Submissions.isDeleted, false),
      ),
    )
    .limit(1);

  if (!submission) {
    throw new ApiError(404, "Phase 1 submission not found");
  }

  if (submission.status !== "pending") {
    throw new ApiError(409, "Only pending Phase 1 submissions can be rejected");
  }

  await db
    .update(teacherPhase1Submissions)
    .set({
      status: "rejected",
      rejectReason: parsedReason,
      adminNotes: notes || null,
      reviewedAt: new Date(),
      reviewedBy: adminUserId,
    })
    .where(eq(teacherPhase1Submissions.id, submission.id));

  const attemptsCount = await db.execute(
    sql`select count(*)::int as count from teacher_phase1_submissions where user_id = ${userId}`,
  );
  const attemptsLeft = Math.max(0, 3 - Number(attemptsCount.rows?.[0]?.count || 0));

  await createNotification({
    userId,
    type: "phase1",
    title: "Phase 1 review result",
    body: `Your Phase 1 submission was rejected (${parsedReason}). Attempts left: ${attemptsLeft}.`,
    payload: {
      submission_id: submission.id,
      reason: parsedReason,
      notes: notes || null,
      attempts_left: attemptsLeft,
    },
  });

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (profile?.email) {
    await sendEmail({
      to: profile.email,
      subject: "Phase 1 rezultat",
      text: `Vasa Phase 1 prijava je odbijena (razlog: ${parsedReason}). ${notes ? `Napomena: ${notes}` : ""}`,
    });
  }

  return { ok: true, attempts_left: attemptsLeft };
};

export const listAdminPhase2Queue = async ({ status = "submitted", page = 1, pageSize = 20 }) => {
  const taskFilters = [];
  if (status !== "all") {
    taskFilters.push(eq(teacherPhase2Tasks.status, status));
  }

  const whereClause = taskFilters.length ? and(...taskFilters) : undefined;

  const [tasks, countRows] = await Promise.all([
    db
      .select({
        task: teacherPhase2Tasks,
        profile: profiles,
      })
      .from(teacherPhase2Tasks)
      .innerJoin(profiles, eq(profiles.userId, teacherPhase2Tasks.userId))
      .where(whereClause)
      .orderBy(desc(teacherPhase2Tasks.updatedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql`count(*)::int` }).from(teacherPhase2Tasks).where(whereClause),
  ]);

  const taskIds = tasks.map((item) => item.task.id);
  const latestSubmissionByTask = new Map();

  if (taskIds.length) {
    const submissionRows = await db
      .select()
      .from(teacherPhase2Submissions)
      .where(and(inArray(teacherPhase2Submissions.taskId, taskIds), eq(teacherPhase2Submissions.isDeleted, false)))
      .orderBy(desc(teacherPhase2Submissions.attemptNo));

    for (const submission of submissionRows) {
      if (!latestSubmissionByTask.has(submission.taskId)) {
        latestSubmissionByTask.set(submission.taskId, submission);
      }
    }
  }

  const rows = tasks.map((item) => {
    const latest = latestSubmissionByTask.get(item.task.id) || null;
    return {
      ...mapPhase2Task(item.task, latest),
      first_name: item.profile.firstName,
      last_name: item.profile.lastName,
      email: item.profile.email,
    };
  });

  return {
    rows,
    page,
    pageSize,
    total: Number(countRows[0]?.count || 0),
  };
};

export const reviewPhase2Task = async ({ adminUserId, action, taskId, submissionId, feedback = null }) => {
  const parsedAction = requireAllowed(action, ["accept", "reject", "retry"], "action");

  const [task] = await db.select().from(teacherPhase2Tasks).where(eq(teacherPhase2Tasks.id, taskId)).limit(1);
  if (!task) {
    throw new ApiError(404, "Phase 2 task not found");
  }

  const [submission] = await db
    .select()
    .from(teacherPhase2Submissions)
    .where(
      and(
        eq(teacherPhase2Submissions.id, submissionId),
        eq(teacherPhase2Submissions.taskId, task.id),
        eq(teacherPhase2Submissions.userId, task.userId),
        eq(teacherPhase2Submissions.isDeleted, false),
      ),
    )
    .limit(1);

  if (!submission) {
    throw new ApiError(404, "Phase 2 submission not found");
  }

  if (submission.status !== "submitted") {
    throw new ApiError(409, "Only submitted entries can be reviewed");
  }

  const now = new Date();

  if (parsedAction === "retry") {
    if (task.currentAttempts >= task.attemptsAllowed) {
      throw new ApiError(400, "Retry not possible. Attempt limit reached.");
    }

    await db
      .update(teacherPhase2Submissions)
      .set({
        status: "retry",
        feedback,
        reviewedAt: now,
        reviewedBy: adminUserId,
      })
      .where(eq(teacherPhase2Submissions.id, submission.id));

    await db
      .update(teacherPhase2Tasks)
      .set({
        status: "retry",
        lastFeedback: feedback,
        updatedAt: now,
      })
      .where(eq(teacherPhase2Tasks.id, task.id));

    await createNotification({
      userId: task.userId,
      type: "phase2",
      title: "Phase 2 retry required",
      body: feedback ? `Please retry your Phase 2 submission. Feedback: ${feedback}` : "Please retry your Phase 2 submission.",
      payload: { task_id: task.id, submission_id: submission.id, action: "retry" },
    });

    return { ok: true, action: "retry" };
  }

  if (parsedAction === "reject") {
    await db
      .update(teacherPhase2Submissions)
      .set({
        status: "rejected",
        feedback,
        reviewedAt: now,
        reviewedBy: adminUserId,
      })
      .where(eq(teacherPhase2Submissions.id, submission.id));

    await db
      .update(teacherPhase2Tasks)
      .set({
        status: "rejected",
        lastFeedback: feedback,
        closedAt: now,
        updatedAt: now,
      })
      .where(eq(teacherPhase2Tasks.id, task.id));

    await setProfilePhase(task.userId, "rejected");

    await createNotification({
      userId: task.userId,
      type: "phase2",
      title: "Phase 2 rejected",
      body: feedback ? `Your Phase 2 submission was rejected. Feedback: ${feedback}` : "Your Phase 2 submission was rejected.",
      payload: { task_id: task.id, submission_id: submission.id, action: "reject" },
    });

    return { ok: true, action: "reject" };
  }

  await db
    .update(teacherPhase2Submissions)
    .set({
      status: "accepted",
      feedback,
      reviewedAt: now,
      reviewedBy: adminUserId,
    })
    .where(eq(teacherPhase2Submissions.id, submission.id));

  await db
    .update(teacherPhase2Tasks)
    .set({
      status: "accepted",
      closedAt: now,
      updatedAt: now,
    })
    .where(eq(teacherPhase2Tasks.id, task.id));

  await setProfilePhase(task.userId, "accepted");

  await createNotification({
    userId: task.userId,
    type: "phase2",
    title: "Prihvacen si",
    body: "Prihvacen si, uskoro ces biti kontaktiran.",
    payload: { task_id: task.id, submission_id: submission.id, action: "accept" },
  });

  await createAnalyticsEvent({
    sessionId: `admin-${adminUserId}`,
    userId: task.userId,
    eventName: "accepted",
    metadata: {
      task_id: task.id,
      submission_id: submission.id,
      reviewed_by: adminUserId,
    },
  });

  return { ok: true, action: "accept" };
};

const cleanupStalePhase1 = async (cutoff) => {
  const staleRows = await db
    .select()
    .from(teacherPhase1Submissions)
    .where(
      and(
        eq(teacherPhase1Submissions.status, "rejected"),
        eq(teacherPhase1Submissions.isDeleted, false),
        sql`${teacherPhase1Submissions.reviewedAt} < ${cutoff}`,
      ),
    )
    .limit(1000);

  let deleted = 0;
  for (const row of staleRows) {
    const removed = await removeBlobSafe(row.videoBlobUrl || row.videoBlobKey);
    await db
      .update(teacherPhase1Submissions)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        storageDeletedAt: removed ? new Date() : null,
      })
      .where(eq(teacherPhase1Submissions.id, row.id));
    if (removed) deleted += 1;
  }

  return { scanned: staleRows.length, deleted };
};

const cleanupClosedPhase2 = async (cutoff) => {
  const closedTasks = await db
    .select({ id: teacherPhase2Tasks.id })
    .from(teacherPhase2Tasks)
    .where(
      and(
        inArray(teacherPhase2Tasks.status, ["accepted", "rejected"]),
        sql`${teacherPhase2Tasks.closedAt} < ${cutoff}`,
      ),
    )
    .limit(1000);

  const taskIds = closedTasks.map((row) => row.id);
  if (!taskIds.length) {
    return { scanned: 0, deleted: 0 };
  }

  const submissionRows = await db
    .select()
    .from(teacherPhase2Submissions)
    .where(and(inArray(teacherPhase2Submissions.taskId, taskIds), eq(teacherPhase2Submissions.isDeleted, false)))
    .limit(5000);

  let deleted = 0;
  for (const row of submissionRows) {
    const removed = await removeBlobSafe(row.videoBlobUrl || row.videoBlobKey);
    await db
      .update(teacherPhase2Submissions)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        storageDeletedAt: removed ? new Date() : null,
      })
      .where(eq(teacherPhase2Submissions.id, row.id));
    if (removed) deleted += 1;
  }

  return { scanned: submissionRows.length, deleted };
};

export const runStorageCleanup = async () => {
  const phase1Cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const phase2Cutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

  const [phase1, phase2] = await Promise.all([cleanupStalePhase1(phase1Cutoff), cleanupClosedPhase2(phase2Cutoff)]);

  return {
    ok: true,
    cutoffs: {
      phase1_rejected_before: phase1Cutoff.toISOString(),
      phase2_closed_before: phase2Cutoff.toISOString(),
    },
    scanned: {
      phase1_candidates: phase1.scanned,
      phase2_candidates: phase2.scanned,
    },
    deleted: {
      stale: phase1.deleted,
      closed: phase2.deleted,
      total: phase1.deleted + phase2.deleted,
    },
  };
};

export const listCandidates = async ({ status = "all", phase = "all", q = "", page = 1, pageSize = 20 }) => {
  const whereParts = [];
  if (phase !== "all") {
    whereParts.push(eq(profiles.currentPhase, phase));
  }

  if (q) {
    const pattern = `%${q}%`;
    whereParts.push(
      or(
        like(profiles.email, pattern),
        like(profiles.firstName, pattern),
        like(profiles.lastName, pattern),
        like(profiles.phone, pattern),
      ),
    );
  }

  const whereClause = whereParts.length ? and(...whereParts) : undefined;

  const [items, totalRows] = await Promise.all([
    db
      .select()
      .from(profiles)
      .where(whereClause)
      .orderBy(desc(profiles.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql`count(*)::int` }).from(profiles).where(whereClause),
  ]);

  const userIds = items.map((row) => row.userId);

  const [phase1Rows, taskRows] = await Promise.all([
    userIds.length
      ? db
          .select()
          .from(teacherPhase1Submissions)
          .where(inArray(teacherPhase1Submissions.userId, userIds))
          .orderBy(desc(teacherPhase1Submissions.createdAt))
      : Promise.resolve([]),
    userIds.length
      ? db.select().from(teacherPhase2Tasks).where(inArray(teacherPhase2Tasks.userId, userIds))
      : Promise.resolve([]),
  ]);

  const latestPhase1ByUser = new Map();
  for (const row of phase1Rows) {
    if (!latestPhase1ByUser.has(row.userId)) {
      latestPhase1ByUser.set(row.userId, row);
    }
  }

  const taskByUser = new Map(taskRows.map((row) => [row.userId, row]));

  const rows = items
    .map((profile) => {
      const latestPhase1 = latestPhase1ByUser.get(profile.userId) || null;
      const phase2Task = taskByUser.get(profile.userId) || null;

      const candidateStatus = phase2Task?.status || latestPhase1?.status || "new";
      if (status !== "all" && candidateStatus !== status) {
        return null;
      }

      return {
        user_id: profile.userId,
        email: profile.email,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
        current_phase: profile.currentPhase,
        latest_phase1_status: latestPhase1?.status || null,
        latest_phase1_attempt: latestPhase1?.attemptNo || null,
        phase2_status: phase2Task?.status || null,
        phase2_attempts: phase2Task ? `${phase2Task.currentAttempts}/${phase2Task.attemptsAllowed}` : null,
        candidate_status: candidateStatus,
        created_at: profile.createdAt,
      };
    })
    .filter(Boolean);

  return {
    rows,
    page,
    pageSize,
    total: Number(totalRows[0]?.count || 0),
  };
};

export const getCandidateDetail = async (userId) => {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!profile) {
    throw new ApiError(404, "Candidate not found");
  }

  const [phase1Rows, phase2TaskRows, phase2SubmissionRows] = await Promise.all([
    db
      .select()
      .from(teacherPhase1Submissions)
      .where(eq(teacherPhase1Submissions.userId, userId))
      .orderBy(asc(teacherPhase1Submissions.attemptNo)),
    db.select().from(teacherPhase2Tasks).where(eq(teacherPhase2Tasks.userId, userId)).limit(1),
    db
      .select()
      .from(teacherPhase2Submissions)
      .where(eq(teacherPhase2Submissions.userId, userId))
      .orderBy(asc(teacherPhase2Submissions.attemptNo)),
  ]);

  return {
    profile: {
      user_id: profile.userId,
      email: profile.email,
      first_name: profile.firstName,
      last_name: profile.lastName,
      phone: profile.phone,
      date_of_birth: profile.dateOfBirth,
      short_about: profile.shortAbout,
      current_phase: profile.currentPhase,
      referral_code: profile.referralCode,
      referred_by_code: profile.referredByCode,
      created_at: profile.createdAt,
    },
    phase1_attempts: phase1Rows.map(mapPhase1),
    phase2_task: phase2TaskRows[0] ? mapPhase2Task(phase2TaskRows[0], null) : null,
    phase2_submissions: phase2SubmissionRows.map((row) => ({
      id: row.id,
      task_id: row.taskId,
      attempt_no: row.attemptNo,
      status: row.status,
      feedback: row.feedback,
      video_blob_key: row.videoBlobKey,
      video_blob_url: row.videoBlobUrl,
      created_at: row.createdAt,
      reviewed_at: row.reviewedAt,
    })),
  };
};

export const listTrainingVideosAdmin = async () => {
  const rows = await db.select().from(trainingVideos).orderBy(asc(trainingVideos.category), asc(trainingVideos.orderIndex));
  return rows.map(mapTrainingVideo);
};

export const createTrainingVideo = async ({ adminUserId, title, category, orderIndex, isActive, storageBlobKey, storageBlobUrl }) => {
  const [row] = await db
    .insert(trainingVideos)
    .values({
      title: requireNonEmptyString(title, "title"),
      category: requireAllowed(category, ["about_us", "bright_sample", "tips"], "category"),
      orderIndex: Number(orderIndex || 0),
      storageBlobKey: requireNonEmptyString(storageBlobKey, "storage_blob_key"),
      storageBlobUrl: requireNonEmptyString(storageBlobUrl, "storage_blob_url"),
      isActive: Boolean(isActive),
      createdBy: adminUserId,
    })
    .returning();

  return mapTrainingVideo(row);
};

export const toggleTrainingVideo = async ({ videoId }) => {
  const [current] = await db.select().from(trainingVideos).where(eq(trainingVideos.id, videoId)).limit(1);
  if (!current) {
    throw new ApiError(404, "Training video not found");
  }

  await db
    .update(trainingVideos)
    .set({
      isActive: !current.isActive,
      updatedAt: new Date(),
    })
    .where(eq(trainingVideos.id, videoId));
};

export const deleteTrainingVideo = async ({ videoId }) => {
  const [current] = await db.select().from(trainingVideos).where(eq(trainingVideos.id, videoId)).limit(1);
  if (!current) {
    throw new ApiError(404, "Training video not found");
  }

  await removeBlobSafe(current.storageBlobUrl || current.storageBlobKey);
  await db.delete(trainingVideos).where(eq(trainingVideos.id, videoId));
};

export const listShowcaseVideosAdmin = async () => {
  const rows = await db.select().from(showcaseVideos).orderBy(asc(showcaseVideos.orderIndex), desc(showcaseVideos.createdAt));
  return rows.map(mapShowcaseVideo);
};

export const createShowcaseVideo = async ({ adminUserId, title, youtubeUrl, youtubeVideoId, thumbnailUrl, orderIndex, isActive }) => {
  const [row] = await db
    .insert(showcaseVideos)
    .values({
      title: requireNonEmptyString(title, "title"),
      youtubeUrl: requireNonEmptyString(youtubeUrl, "youtube_url"),
      youtubeVideoId: requireNonEmptyString(youtubeVideoId, "youtube_video_id"),
      thumbnailUrl: thumbnailUrl || null,
      orderIndex: Number(orderIndex || 0),
      isActive: Boolean(isActive),
      createdBy: adminUserId,
    })
    .returning();

  return mapShowcaseVideo(row);
};

export const toggleShowcaseVideo = async ({ videoId }) => {
  const [current] = await db.select().from(showcaseVideos).where(eq(showcaseVideos.id, videoId)).limit(1);
  if (!current) {
    throw new ApiError(404, "Showcase video not found");
  }

  await db
    .update(showcaseVideos)
    .set({
      isActive: !current.isActive,
      updatedAt: new Date(),
    })
    .where(eq(showcaseVideos.id, videoId));
};

export const deleteShowcaseVideo = async ({ videoId }) => {
  await db.delete(showcaseVideos).where(eq(showcaseVideos.id, videoId));
};
