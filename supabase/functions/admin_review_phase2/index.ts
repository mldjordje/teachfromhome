import { json, readJson, handleError, HttpError, preflight, methodNotAllowed } from "../_shared/http.ts";
import { assertAdmin, getServiceClient, requireUser } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/email.ts";
import { createNotification } from "../_shared/notifications.ts";
import { requireAllowed, requireNonEmptyString } from "../_shared/validators.ts";

type ReviewPhase2Body = {
  action: "accept" | "reject" | "retry";
  task_id: string;
  submission_id: string;
  feedback?: string;
};

Deno.serve(async (req) => {
  try {
    const pre = preflight(req);
    if (pre) return pre;

    if (req.method !== "POST") {
      throw methodNotAllowed();
    }

    const { user } = await requireUser(req);
    const body = await readJson<ReviewPhase2Body>(req);

    const action = requireAllowed(body.action, ["accept", "reject", "retry"] as const, "action");
    const taskId = requireNonEmptyString(body.task_id, "task_id");
    const submissionId = requireNonEmptyString(body.submission_id, "submission_id");
    const feedback = body.feedback?.trim() || null;

    const service = getServiceClient();
    await assertAdmin(service, user.id);

    const { data: task, error: taskError } = await service
      .from("teacher_phase2_tasks")
      .select("id, user_id, status, attempts_allowed, current_attempts")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      throw new HttpError(404, "Phase 2 task not found");
    }

    const { data: submission, error: submissionError } = await service
      .from("teacher_phase2_submissions")
      .select("id, task_id, user_id, status, attempt_no")
      .eq("id", submissionId)
      .eq("task_id", task.id)
      .eq("user_id", task.user_id)
      .eq("is_deleted", false)
      .single();

    if (submissionError || !submission) {
      throw new HttpError(404, "Phase 2 submission not found");
    }

    if (submission.status !== "submitted") {
      throw new HttpError(409, "Only submitted entries can be reviewed");
    }

    const nowIso = new Date().toISOString();

    const { data: profile } = await service
      .from("profiles")
      .select("email")
      .eq("user_id", task.user_id)
      .single();

    if (action === "retry") {
      if (task.current_attempts >= task.attempts_allowed) {
        throw new HttpError(400, "Retry not possible. Attempt limit reached.");
      }

      const { error: submissionUpdateError } = await service
        .from("teacher_phase2_submissions")
        .update({
          status: "retry",
          feedback,
          reviewed_at: nowIso,
          reviewed_by: user.id,
        })
        .eq("id", submission.id);

      if (submissionUpdateError) {
        throw new HttpError(500, "Failed to update Phase 2 submission", submissionUpdateError.message);
      }

      const { error: taskUpdateError } = await service
        .from("teacher_phase2_tasks")
        .update({
          status: "retry",
          last_feedback: feedback,
          updated_at: nowIso,
        })
        .eq("id", task.id);

      if (taskUpdateError) {
        throw new HttpError(500, "Failed to update Phase 2 task", taskUpdateError.message);
      }

      await createNotification(service, {
        user_id: task.user_id,
        type: "phase2",
        title: "Phase 2 retry required",
        body: feedback
          ? `Please retry your Phase 2 submission. Feedback: ${feedback}`
          : "Please retry your Phase 2 submission.",
        payload: { task_id: task.id, submission_id: submission.id, action: "retry" },
      });

      if (profile?.email) {
        await sendEmail({
          to: profile.email,
          subject: "Phase 2 - potreban retry",
          text: feedback
            ? `Potreban je novi pokusaj za Phase 2. Feedback: ${feedback}`
            : "Potreban je novi pokusaj za Phase 2.",
        });
      }

      return json({ ok: true, action: "retry" });
    }

    if (action === "reject") {
      const { error: submissionUpdateError } = await service
        .from("teacher_phase2_submissions")
        .update({
          status: "rejected",
          feedback,
          reviewed_at: nowIso,
          reviewed_by: user.id,
        })
        .eq("id", submission.id);

      if (submissionUpdateError) {
        throw new HttpError(500, "Failed to update Phase 2 submission", submissionUpdateError.message);
      }

      const { error: taskUpdateError } = await service
        .from("teacher_phase2_tasks")
        .update({
          status: "rejected",
          last_feedback: feedback,
          closed_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", task.id);

      if (taskUpdateError) {
        throw new HttpError(500, "Failed to update Phase 2 task", taskUpdateError.message);
      }

      await service.from("profiles").update({ current_phase: "rejected" }).eq("user_id", task.user_id);

      await createNotification(service, {
        user_id: task.user_id,
        type: "phase2",
        title: "Phase 2 rejected",
        body: feedback
          ? `Your Phase 2 submission was rejected. Feedback: ${feedback}`
          : "Your Phase 2 submission was rejected.",
        payload: { task_id: task.id, submission_id: submission.id, action: "reject" },
      });

      if (profile?.email) {
        await sendEmail({
          to: profile.email,
          subject: "Phase 2 rezultat",
          text: feedback
            ? `Vasa Phase 2 prijava je odbijena. Feedback: ${feedback}`
            : "Vasa Phase 2 prijava je odbijena.",
        });
      }

      return json({ ok: true, action: "reject" });
    }

    const { error: submissionUpdateError } = await service
      .from("teacher_phase2_submissions")
      .update({
        status: "accepted",
        feedback,
        reviewed_at: nowIso,
        reviewed_by: user.id,
      })
      .eq("id", submission.id);

    if (submissionUpdateError) {
      throw new HttpError(500, "Failed to update Phase 2 submission", submissionUpdateError.message);
    }

    const { error: taskUpdateError } = await service
      .from("teacher_phase2_tasks")
      .update({
        status: "accepted",
        closed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", task.id);

    if (taskUpdateError) {
      throw new HttpError(500, "Failed to update Phase 2 task", taskUpdateError.message);
    }

    await service.from("profiles").update({ current_phase: "accepted" }).eq("user_id", task.user_id);

    await createNotification(service, {
      user_id: task.user_id,
      type: "phase2",
      title: "Prihvacen si",
      body: "Prihvacen si, uskoro ces biti kontaktiran.",
      payload: { task_id: task.id, submission_id: submission.id, action: "accept" },
    });

    if (profile?.email) {
      await sendEmail({
        to: profile.email,
        subject: "Prihvacen si",
        text: "Prihvacen si, uskoro ces biti kontaktiran.",
      });
    }

    await service.from("analytics_events").insert({
      session_id: `admin-${user.id}`,
      user_id: task.user_id,
      event_name: "accepted",
      metadata: {
        task_id: task.id,
        submission_id: submission.id,
        reviewed_by: user.id,
      },
    });

    return json({ ok: true, action: "accept" });
  } catch (error) {
    return handleError(error);
  }
});

