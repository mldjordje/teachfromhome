import { json, readJson, handleError, HttpError } from "../_shared/http.ts";
import { getServiceClient, requireUser } from "../_shared/supabase.ts";
import { requireNonEmptyString, requireVideoPath } from "../_shared/validators.ts";
import { createNotification } from "../_shared/notifications.ts";

type Phase2Body = {
  task_id: string;
  video_path: string;
};

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const { user } = await requireUser(req);
    const body = await readJson<Phase2Body>(req);

    const taskId = requireNonEmptyString(body.task_id, "task_id");
    const videoPath = requireVideoPath(body.video_path);

    const service = getServiceClient();

    const { data: task, error: taskError } = await service
      .from("teacher_phase2_tasks")
      .select("id, user_id, status, attempts_allowed, current_attempts")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (taskError || !task) {
      throw new HttpError(404, "Phase 2 task not found");
    }

    if (task.status === "accepted" || task.status === "rejected") {
      throw new HttpError(400, "Task is already closed");
    }

    if (task.status === "submitted") {
      throw new HttpError(409, "Current submission is still pending review");
    }

    if (task.current_attempts >= task.attempts_allowed) {
      throw new HttpError(400, "Maximum Phase 2 attempts reached");
    }

    const { data: submissions, error: submissionsError } = await service
      .from("teacher_phase2_submissions")
      .select("attempt_no")
      .eq("task_id", task.id)
      .eq("is_deleted", false)
      .order("attempt_no", { ascending: true });

    if (submissionsError) {
      throw new HttpError(500, "Failed to load Phase 2 submissions", submissionsError.message);
    }

    const attemptNo = (submissions?.length ?? 0) + 1;
    if (attemptNo > task.attempts_allowed) {
      throw new HttpError(400, "Maximum Phase 2 attempts reached");
    }

    const { data: insertedSubmission, error: insertError } = await service
      .from("teacher_phase2_submissions")
      .insert({
        task_id: task.id,
        user_id: user.id,
        attempt_no: attemptNo,
        video_path: videoPath,
        status: "submitted",
      })
      .select("id, task_id, user_id, attempt_no, status, created_at")
      .single();

    if (insertError) {
      throw new HttpError(500, "Failed to create Phase 2 submission", insertError.message);
    }

    const { error: taskUpdateError } = await service
      .from("teacher_phase2_tasks")
      .update({
        status: "submitted",
        current_attempts: attemptNo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id)
      .eq("user_id", user.id);

    if (taskUpdateError) {
      throw new HttpError(500, "Failed to update task status", taskUpdateError.message);
    }

    await createNotification(service, {
      user_id: user.id,
      type: "phase2",
      title: "Phase 2 submitted",
      body: "Your Phase 2 video has been submitted and is pending admin review.",
      payload: { task_id: task.id, submission_id: insertedSubmission.id, attempt_no: attemptNo },
    });

    return json({
      ok: true,
      submission: insertedSubmission,
    });
  } catch (error) {
    return handleError(error);
  }
});
