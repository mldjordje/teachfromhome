import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db } from "@/src/server/db/client";
import {
  adminUsers,
  analyticsEvents,
  profiles,
  referralRewards,
  showcaseVideos,
  teacherPhase1Submissions,
  teacherPhase2Submissions,
  teacherPhase2Tasks,
  trainingVideos,
} from "@/src/server/db/schema";
import { ApiError, requireAllowed, requireNonEmptyString } from "@/src/server/http/errors";
import { createAnalyticsEvent } from "@/src/server/services/analyticsService";
import { sendEmail } from "@/src/server/services/emailService";
import { createNotification } from "@/src/server/services/notificationService";
import { getBlobPreviewUrl, parseBlobUrl, removeBlobSafe } from "@/src/server/services/storageService";
import { setProfilePhase } from "@/src/server/services/authService";
import { MAX_PHASE1_ATTEMPTS } from "@/src/config/teacherFlow";

const trackedEvents = ["visits", "started_signup", "phase1_submitted", "phase1_passed", "phase2_submitted", "accepted"];

const toPercent = (value, base) => {
  const num = Number(value || 0);
  const den = Number(base || 0);
  if (!den) return 0;
  return Math.round((num / den) * 1000) / 10;
};

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

const sanitizeFileSegment = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const detectBlobExtension = ({ blobKey, blobUrl }) => {
  const sourcePath = blobKey || parseBlobUrl(blobUrl || "") || "";
  const cleanPath = sourcePath.split("?")[0];
  const parts = cleanPath.split(".");
  if (parts.length <= 1) return "mp4";
  const ext = parts.pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext || "mp4";
};

const buildAcceptedClipFileName = ({ firstName, lastName, email, attemptNo, blobKey, blobUrl }) => {
  const personSegment = sanitizeFileSegment([firstName, lastName].filter(Boolean).join("-"));
  const emailSegment = sanitizeFileSegment(String(email || "").split("@")[0]);
  const candidateSegment = personSegment || emailSegment || "candidate";
  const safeAttempt = Number(attemptNo) > 0 ? Number(attemptNo) : "x";
  const ext = detectBlobExtension({ blobKey, blobUrl });
  return `accepted-${candidateSegment}-phase2-attempt-${safeAttempt}.${ext}`;
};

const daysSince = (value) => {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 1;
  const diffMs = Date.now() - time;
  if (diffMs <= 0) return 1;
  return Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
};

const buildStuckCandidates = ({ phase1Rows = [], phase2Rows = [] }) => {
  const phase1Items = (phase1Rows || []).map((row) => ({
    id: `phase1-${row.submission_id}`,
    user_id: row.user_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    status: "pending",
    stuck_kind: "phase1_pending_review",
    stuck_label: "Faza 1 ceka admin review",
    days_waiting: daysSince(row.created_at),
    waiting_since: row.created_at,
    queue_link: "/admin/phase1",
    candidate_link: `/admin/candidates/${encodeURIComponent(row.user_id)}`,
    reminder_kind: null,
  }));

  const phase2Items = (phase2Rows || []).map((row) => {
    const taskStatus = String(row.status || "");
    return {
      id: `phase2-${row.task_id}`,
      user_id: row.user_id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      status: taskStatus,
      stuck_kind: taskStatus === "retry" ? "phase2_retry_waiting_candidate" : "phase2_assigned_waiting_candidate",
      stuck_label: taskStatus === "retry" ? "Faza 2 retry ceka kandidata" : "Faza 2 dodeljena, bez predaje",
      days_waiting: daysSince(row.updated_at),
      waiting_since: row.updated_at,
      queue_link: "/admin/phase2",
      candidate_link: `/admin/candidates/${encodeURIComponent(row.user_id)}`,
      reminder_kind: "phase2_submit",
      attempts_progress: `${Number(row.current_attempts || 0)} / ${Number(row.attempts_allowed || 3)}`,
    };
  });

  const items = [...phase1Items, ...phase2Items]
    .sort((a, b) => {
      const dayDiff = Number(b.days_waiting || 0) - Number(a.days_waiting || 0);
      if (dayDiff !== 0) return dayDiff;
      return new Date(a.waiting_since).getTime() - new Date(b.waiting_since).getTime();
    })
    .slice(0, 12);

  return {
    rows: items,
    summary: {
      total: items.length,
      phase1_pending_review: phase1Items.length,
      phase2_waiting_candidate: phase2Items.length,
    },
  };
};

export const getAdminDashboardData = async () => {
  const [phase1Pending, phase2Pending, acceptedCount, dailyRows, stuckPhase1, stuckPhase2] = await Promise.all([
    db.execute(sql`select count(*)::int as count from teacher_phase1_submissions where status = 'pending' and is_deleted = false`),
    db.execute(sql`select count(*)::int as count from teacher_phase2_tasks where status in ('submitted','retry','assigned')`),
    db.execute(sql`select count(*)::int as count from profiles where current_phase = 'accepted'`),
    db.execute(sql`
      select
        date_trunc('day', created_at) as day,
        event_name,
        count(*)::int as count
      from analytics_events
      where created_at >= now() - interval '14 days'
        and event_name in ('visits', 'started_signup', 'phase1_submitted', 'phase1_passed', 'phase2_submitted', 'accepted')
      group by 1, 2
      order by 1 asc
    `),
    db.execute(sql`
      select
        p.user_id,
        p.first_name,
        p.last_name,
        p.email,
        s.id as submission_id,
        s.created_at
      from teacher_phase1_submissions s
      inner join profiles p on p.user_id = s.user_id
      where s.status = 'pending'
        and s.is_deleted = false
        and s.created_at < now() - interval '48 hours'
      order by s.created_at asc
      limit 24
    `),
    db.execute(sql`
      select
        p.user_id,
        p.first_name,
        p.last_name,
        p.email,
        t.id as task_id,
        t.status,
        t.current_attempts,
        t.attempts_allowed,
        t.updated_at
      from teacher_phase2_tasks t
      inner join profiles p on p.user_id = t.user_id
      where t.status in ('assigned', 'retry')
        and t.updated_at < now() - interval '48 hours'
      order by t.updated_at asc
      limit 24
    `),
  ]);

  const analyticsSummary = {};
  for (const eventName of trackedEvents) {
    const result = await db.execute(sql`select count(*)::int as count from analytics_events where event_name = ${eventName}`);
    analyticsSummary[eventName] = Number(result.rows?.[0]?.count || 0);
  }

  const funnelStages = [
    { key: "visits", label: "Posete" },
    { key: "started_signup", label: "Započete prijave" },
    { key: "phase1_submitted", label: "Faza 1 poslata" },
    { key: "phase1_passed", label: "Faza 1 prošla" },
    { key: "phase2_submitted", label: "Faza 2 poslata" },
    { key: "accepted", label: "Prihvaćeni" },
  ].map((stage, index, list) => {
    const count = Number(analyticsSummary[stage.key] || 0);
    const prev = index > 0 ? Number(analyticsSummary[list[index - 1].key] || 0) : 0;
    return {
      key: stage.key,
      label: stage.label,
      count,
      rate_from_prev: index === 0 ? 100 : toPercent(count, prev),
      rate_from_visits: toPercent(count, analyticsSummary.visits || 0),
    };
  });

  const dailyMap = new Map();
  for (const row of dailyRows.rows || []) {
    const dayKey = new Date(row.day).toISOString().slice(0, 10);
    if (!dailyMap.has(dayKey)) {
      dailyMap.set(dayKey, {
        day: dayKey,
        visits: 0,
        started_signup: 0,
        phase1_submitted: 0,
        phase1_passed: 0,
        phase2_submitted: 0,
        accepted: 0,
      });
    }

    const bucket = dailyMap.get(dayKey);
    bucket[row.event_name] = Number(row.count || 0);
  }

  const dailyFunnel = [...dailyMap.values()].map((item) => ({
    ...item,
    accept_rate_from_visits: toPercent(item.accepted, item.visits),
    phase1_rate_from_visits: toPercent(item.phase1_submitted, item.visits),
  }));

  const stuck = buildStuckCandidates({
    phase1Rows: stuckPhase1.rows || [],
    phase2Rows: stuckPhase2.rows || [],
  });

  return {
    phase1Pending: Number(phase1Pending.rows?.[0]?.count || 0),
    phase2Pending: Number(phase2Pending.rows?.[0]?.count || 0),
    acceptedCount: Number(acceptedCount.rows?.[0]?.count || 0),
    analyticsSummary,
    funnel: {
      stages: funnelStages,
      visit_to_accept_rate: toPercent(analyticsSummary.accepted || 0, analyticsSummary.visits || 0),
      signup_to_accept_rate: toPercent(analyticsSummary.accepted || 0, analyticsSummary.started_signup || 0),
    },
    dailyFunnel,
    stuckCandidates: stuck.rows,
    stuckSummary: stuck.summary,
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
    type: "phase1",
    title: "Prosli ste Phase 1",
    body: "Cestitamo! Uspesno ste prosli Phase 1 i prebaceni ste u Phase 2. Udjite u aplikaciju za sledeci korak.",
    payload: { submission_id: submission.id },
  });

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (profile?.email) {
    await sendEmail({
      to: profile.email,
      subject: "Prosli ste Phase 1",
      text: "Cestitamo! Uspesno ste prosli Phase 1 i prebaceni ste u Phase 2. Udjite u aplikaciju za sledeci korak.",
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

export const listAcceptedCandidates = async ({ q = "", page = 1, pageSize = 20 }) => {
  const filters = [eq(teacherPhase2Tasks.status, "accepted")];
  if (q) {
    const pattern = `%${q}%`;
    filters.push(
      or(
        like(profiles.email, pattern),
        like(profiles.firstName, pattern),
        like(profiles.lastName, pattern),
        like(profiles.phone, pattern),
      ),
    );
  }

  const whereClause = and(...filters);

  const [items, countRows] = await Promise.all([
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
    db
      .select({ count: sql`count(*)::int` })
      .from(teacherPhase2Tasks)
      .innerJoin(profiles, eq(profiles.userId, teacherPhase2Tasks.userId))
      .where(whereClause),
  ]);

  const taskIds = items.map((item) => item.task.id);
  const latestSubmissionByTask = new Map();

  if (taskIds.length) {
    const submissionRows = await db
      .select()
      .from(teacherPhase2Submissions)
      .where(and(inArray(teacherPhase2Submissions.taskId, taskIds), eq(teacherPhase2Submissions.isDeleted, false)))
      .orderBy(desc(teacherPhase2Submissions.attemptNo), desc(teacherPhase2Submissions.createdAt));

    for (const submission of submissionRows) {
      if (!latestSubmissionByTask.has(submission.taskId)) {
        latestSubmissionByTask.set(submission.taskId, submission);
      }
    }
  }

  const rows = items.map((item) => {
    const latest = latestSubmissionByTask.get(item.task.id) || null;
    return {
      user_id: item.profile.userId,
      first_name: item.profile.firstName,
      last_name: item.profile.lastName,
      email: item.profile.email,
      phone: item.profile.phone,
      current_phase: item.profile.currentPhase,
      task_id: item.task.id,
      phase2_sentence: item.task.phase2Sentence,
      task_status: item.task.status,
      attempts_allowed: item.task.attemptsAllowed,
      current_attempts: item.task.currentAttempts,
      task_updated_at: item.task.updatedAt,
      task_closed_at: item.task.closedAt,
      accepted_at: latest?.reviewedAt || item.task.closedAt || item.task.updatedAt,
      latest_submission_id: latest?.id || null,
      latest_submission_status: latest?.status || null,
      latest_attempt_no: latest?.attemptNo || null,
      latest_video_blob_key: latest?.videoBlobKey || null,
      latest_video_blob_url: latest?.videoBlobUrl || null,
      latest_submission_created_at: latest?.createdAt || null,
      latest_submission_reviewed_at: latest?.reviewedAt || null,
    };
  });

  return {
    rows,
    page,
    pageSize,
    total: Number(countRows[0]?.count || 0),
  };
};

export const getAcceptedCandidateDownload = async ({ submissionId }) => {
  const parsedSubmissionId = requireNonEmptyString(submissionId, "submission_id");

  const [row] = await db
    .select({
      submission: teacherPhase2Submissions,
      task: teacherPhase2Tasks,
      profile: profiles,
    })
    .from(teacherPhase2Submissions)
    .innerJoin(teacherPhase2Tasks, eq(teacherPhase2Tasks.id, teacherPhase2Submissions.taskId))
    .innerJoin(profiles, eq(profiles.userId, teacherPhase2Submissions.userId))
    .where(and(eq(teacherPhase2Submissions.id, parsedSubmissionId), eq(teacherPhase2Submissions.isDeleted, false)))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "Accepted candidate clip not found");
  }

  const isAccepted =
    row.task.status === "accepted" || row.submission.status === "accepted" || row.profile.currentPhase === "accepted";

  if (!isAccepted) {
    throw new ApiError(409, "Candidate is not in accepted state");
  }

  const blobRef = row.submission.videoBlobUrl || row.submission.videoBlobKey;
  if (!blobRef) {
    throw new ApiError(404, "Clip is missing for this submission");
  }

  const downloadUrl = await getBlobPreviewUrl(blobRef);
  if (!downloadUrl) {
    throw new ApiError(404, "Clip download URL could not be generated");
  }

  return {
    downloadUrl,
    fileName: buildAcceptedClipFileName({
      firstName: row.profile.firstName,
      lastName: row.profile.lastName,
      email: row.profile.email,
      attemptNo: row.submission.attemptNo,
      blobKey: row.submission.videoBlobKey,
      blobUrl: row.submission.videoBlobUrl,
    }),
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

  const [profile] = await db
    .select({
      email: profiles.email,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
    })
    .from(profiles)
    .where(eq(profiles.userId, task.userId))
    .limit(1);

  const candidateName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || task.userId;

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

    if (profile?.email) {
      await sendEmail({
        to: profile.email,
        subject: "Phase 2 - potreban novi pokusaj",
        text:
          feedback && feedback.trim()
            ? `Zdravo ${candidateName},\n\nPotrebno je da ponovite Phase 2 prijavu.\n\nFeedback admina: ${feedback}\n\nPrijavite se i posaljite novi pokusaj u aplikaciji.`
            : `Zdravo ${candidateName},\n\nPotrebno je da ponovite Phase 2 prijavu.\n\nPrijavite se i posaljite novi pokusaj u aplikaciji.`,
      });
    }

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

    if (profile?.email) {
      await sendEmail({
        to: profile.email,
        subject: "Phase 2 rezultat - odbijeno",
        text:
          feedback && feedback.trim()
            ? `Zdravo ${candidateName},\n\nVasa Phase 2 prijava je odbijena.\n\nFeedback admina: ${feedback}`
            : `Zdravo ${candidateName},\n\nVasa Phase 2 prijava je odbijena.`,
      });
    }

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

  if (profile?.email) {
    await sendEmail({
      to: profile.email,
      subject: "Cestitamo - prosli ste selekciju",
      text: `Zdravo ${candidateName},\n\nCestitamo! Vasa Phase 2 prijava je prihvacena.\nUskoro cete biti kontaktirani od strane tima.`,
    });
  }

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

export const deletePhase1SubmissionVideo = async ({ adminUserId, userId, submissionId }) => {
  const parsedUserId = requireNonEmptyString(userId, "user_id");
  const parsedSubmissionId = requireNonEmptyString(submissionId, "submission_id");

  const [submission] = await db
    .select()
    .from(teacherPhase1Submissions)
    .where(
      and(
        eq(teacherPhase1Submissions.id, parsedSubmissionId),
        eq(teacherPhase1Submissions.userId, parsedUserId),
        eq(teacherPhase1Submissions.isDeleted, false),
      ),
    )
    .limit(1);

  if (!submission) {
    throw new ApiError(404, "Phase 1 submission not found");
  }

  if (!["rejected", "moved_to_phase2"].includes(submission.status)) {
    throw new ApiError(409, "Video mozete obrisati tek nakon review statusa (rejected ili moved_to_phase2).");
  }

  const removed = await removeBlobSafe(submission.videoBlobUrl || submission.videoBlobKey);
  const now = new Date();

  await db
    .update(teacherPhase1Submissions)
    .set({
      isDeleted: true,
      deletedAt: now,
      storageDeletedAt: removed ? now : null,
      reviewedAt: submission.reviewedAt || now,
      reviewedBy: submission.reviewedBy || adminUserId || null,
      adminNotes: submission.adminNotes || "Video uklonjen od strane admina.",
    })
    .where(eq(teacherPhase1Submissions.id, submission.id));

  return { ok: true, removed };
};

export const deletePhase2SubmissionVideo = async ({ adminUserId, taskId, submissionId }) => {
  const parsedTaskId = requireNonEmptyString(taskId, "task_id");
  const parsedSubmissionId = requireNonEmptyString(submissionId, "submission_id");

  const [task] = await db.select().from(teacherPhase2Tasks).where(eq(teacherPhase2Tasks.id, parsedTaskId)).limit(1);
  if (!task) {
    throw new ApiError(404, "Phase 2 task not found");
  }

  const [submission] = await db
    .select()
    .from(teacherPhase2Submissions)
    .where(
      and(
        eq(teacherPhase2Submissions.id, parsedSubmissionId),
        eq(teacherPhase2Submissions.taskId, parsedTaskId),
        eq(teacherPhase2Submissions.isDeleted, false),
      ),
    )
    .limit(1);

  if (!submission) {
    throw new ApiError(404, "Phase 2 submission not found");
  }

  const isTaskClosed = ["accepted", "rejected"].includes(task.status);
  const isSubmissionClosed = ["accepted", "rejected"].includes(submission.status);
  if (!isTaskClosed && !isSubmissionClosed) {
    throw new ApiError(409, "Video mozete obrisati nakon finalnog review statusa (accepted ili rejected).");
  }

  const removed = await removeBlobSafe(submission.videoBlobUrl || submission.videoBlobKey);
  const now = new Date();

  await db
    .update(teacherPhase2Submissions)
    .set({
      isDeleted: true,
      deletedAt: now,
      storageDeletedAt: removed ? now : null,
      reviewedAt: submission.reviewedAt || now,
      reviewedBy: submission.reviewedBy || adminUserId || null,
      feedback: submission.feedback || "Video uklonjen od strane admina.",
    })
    .where(eq(teacherPhase2Submissions.id, submission.id));

  return { ok: true, removed };
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
          .where(and(inArray(teacherPhase1Submissions.userId, userIds), eq(teacherPhase1Submissions.isDeleted, false)))
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

export const sendCandidateReminder = async ({ adminUserId, userId, kind }) => {
  const parsedUserId = requireNonEmptyString(userId, "user_id");
  const parsedKind = requireAllowed(kind, ["phase1_retry", "phase2_submit"], "kind");

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, parsedUserId)).limit(1);
  if (!profile) {
    throw new ApiError(404, "Candidate not found");
  }

  const firstName = profile.firstName || "Kandidat";

  if (parsedKind === "phase2_submit") {
    const [task] = await db.select().from(teacherPhase2Tasks).where(eq(teacherPhase2Tasks.userId, parsedUserId)).limit(1);

    if (!task || !["assigned", "retry"].includes(task.status)) {
      throw new ApiError(409, "Reminder moze da se posalje samo kada kandidat treba da posalje Fazu 2.");
    }

    const body =
      task.status === "retry"
        ? "Podsetnik: u aplikaciji te ceka retry za Fazu 2. Posalji novi pokusaj kada zavrsis dorade."
        : "Podsetnik: dodeljen ti je zadatak za Fazu 2. Posalji video da bi prijava isla dalje.";

    await createNotification({
      userId: parsedUserId,
      type: "phase2",
      title: "Podsetnik za Fazu 2",
      body,
      payload: {
        reminder_kind: parsedKind,
        admin_user_id: adminUserId,
        task_status: task.status,
      },
    });

    if (profile.email) {
      await sendEmail({
        to: profile.email,
        subject: "TeachFromHome podsetnik - Faza 2",
        text:
          task.status === "retry"
            ? `Zdravo ${firstName},\n\nPodsetnik: tvoj poslednji Phase 2 video je vracen na doradu (retry). Prijavi se i posalji novi pokusaj.\n\nTeachFromHome tim`
            : `Zdravo ${firstName},\n\nPodsetnik: dodeljen ti je zadatak za Phase 2. Prijavi se i posalji video kako bi prijava nastavila dalje.\n\nTeachFromHome tim`,
      });
    }

    return { ok: true, kind: parsedKind };
  }

  const attempts = await db
    .select()
    .from(teacherPhase1Submissions)
    .where(and(eq(teacherPhase1Submissions.userId, parsedUserId), eq(teacherPhase1Submissions.isDeleted, false)))
    .orderBy(desc(teacherPhase1Submissions.attemptNo));

  const latestAttempt = attempts[0] || null;
  const attemptsLeft = Math.max(0, MAX_PHASE1_ATTEMPTS - attempts.length);

  if (!latestAttempt || latestAttempt.status !== "rejected" || attemptsLeft <= 0) {
    throw new ApiError(409, "Reminder za Fazu 1 moze da se posalje samo kandidatu koji ima pravo na novi pokusaj.");
  }

  await createNotification({
    userId: parsedUserId,
    type: "phase1",
    title: "Podsetnik za Fazu 1",
    body: `Podsetnik: mozes da posaljes novi pokusaj za Fazu 1. Preostalo pokusaja: ${attemptsLeft}.`,
    payload: {
      reminder_kind: parsedKind,
      admin_user_id: adminUserId,
      attempts_left: attemptsLeft,
    },
  });

  if (profile.email) {
    await sendEmail({
      to: profile.email,
      subject: "TeachFromHome podsetnik - Faza 1",
      text: `Zdravo ${firstName},\n\nPodsetnik: mozes da posaljes novi pokusaj za Phase 1. Preostalo pokusaja: ${attemptsLeft}.\n\nTeachFromHome tim`,
    });
  }

  return { ok: true, kind: parsedKind };
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
      .where(and(eq(teacherPhase1Submissions.userId, userId), eq(teacherPhase1Submissions.isDeleted, false)))
      .orderBy(asc(teacherPhase1Submissions.attemptNo)),
    db.select().from(teacherPhase2Tasks).where(eq(teacherPhase2Tasks.userId, userId)).limit(1),
    db
      .select()
      .from(teacherPhase2Submissions)
      .where(and(eq(teacherPhase2Submissions.userId, userId), eq(teacherPhase2Submissions.isDeleted, false)))
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

export const deleteCandidate = async ({ adminUserId, userId }) => {
  const parsedUserId = requireNonEmptyString(userId, "user_id");

  if (parsedUserId === adminUserId) {
    throw new ApiError(400, "Admin ne moze obrisati sopstveni nalog.");
  }

  const [profile, adminRow] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, parsedUserId)).limit(1),
    db.select().from(adminUsers).where(eq(adminUsers.userId, parsedUserId)).limit(1),
  ]);

  if (!profile[0]) {
    throw new ApiError(404, "Candidate not found");
  }

  if (adminRow[0]) {
    throw new ApiError(400, "Admin nalog ne moze biti obrisan kroz candidates stranu.");
  }

  const [phase1Rows, phase2Rows] = await Promise.all([
    db
      .select({
        videoBlobUrl: teacherPhase1Submissions.videoBlobUrl,
        videoBlobKey: teacherPhase1Submissions.videoBlobKey,
      })
      .from(teacherPhase1Submissions)
      .where(and(eq(teacherPhase1Submissions.userId, parsedUserId), eq(teacherPhase1Submissions.isDeleted, false))),
    db
      .select({
        videoBlobUrl: teacherPhase2Submissions.videoBlobUrl,
        videoBlobKey: teacherPhase2Submissions.videoBlobKey,
      })
      .from(teacherPhase2Submissions)
      .where(and(eq(teacherPhase2Submissions.userId, parsedUserId), eq(teacherPhase2Submissions.isDeleted, false))),
  ]);

  const blobRefs = [...phase1Rows, ...phase2Rows]
    .map((row) => row.videoBlobUrl || row.videoBlobKey)
    .filter(Boolean);

  await Promise.all(blobRefs.map((blobRef) => removeBlobSafe(blobRef)));
  await db.delete(profiles).where(eq(profiles.userId, parsedUserId));

  return {
    ok: true,
    removed_blob_count: blobRefs.length,
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

export const createShowcaseVideo = async ({
  adminUserId,
  title,
  source,
  youtubeUrl,
  youtubeVideoId,
  thumbnailUrl,
  storageBlobKey,
  storageBlobUrl,
  orderIndex,
  isActive,
}) => {
  const hasNativeSource = Boolean(storageBlobKey || storageBlobUrl || source === "native");
  const hasYoutubeSource = Boolean(youtubeUrl || youtubeVideoId || source === "youtube");

  if (!hasNativeSource && !hasYoutubeSource) {
    throw new ApiError(400, "Provide either native storage video or YouTube data for showcase item.");
  }

  const normalizedSource = hasNativeSource ? "native" : "youtube";

  const normalizedYoutubeUrl =
    normalizedSource === "youtube" ? requireNonEmptyString(youtubeUrl, "youtube_url") : youtubeUrl || null;
  const normalizedYoutubeVideoId =
    normalizedSource === "youtube" ? requireNonEmptyString(youtubeVideoId, "youtube_video_id") : youtubeVideoId || null;
  const normalizedStorageBlobKey =
    normalizedSource === "native" ? requireNonEmptyString(storageBlobKey, "storage_blob_key") : storageBlobKey || null;
  const normalizedStorageBlobUrl =
    normalizedSource === "native" ? requireNonEmptyString(storageBlobUrl, "storage_blob_url") : storageBlobUrl || null;

  const [row] = await db
    .insert(showcaseVideos)
    .values({
      title: requireNonEmptyString(title, "title"),
      source: normalizedSource,
      youtubeUrl: normalizedYoutubeUrl,
      youtubeVideoId: normalizedYoutubeVideoId,
      thumbnailUrl: thumbnailUrl || null,
      storageBlobKey: normalizedStorageBlobKey,
      storageBlobUrl: normalizedStorageBlobUrl,
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
  const [current] = await db.select().from(showcaseVideos).where(eq(showcaseVideos.id, videoId)).limit(1);
  if (!current) {
    throw new ApiError(404, "Showcase video not found");
  }

  if (current.storageBlobUrl || current.storageBlobKey) {
    await removeBlobSafe(current.storageBlobUrl || current.storageBlobKey);
  }

  await db.delete(showcaseVideos).where(eq(showcaseVideos.id, videoId));
};
