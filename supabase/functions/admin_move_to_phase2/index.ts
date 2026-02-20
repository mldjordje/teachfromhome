import { json, readJson, handleError, HttpError, preflight, methodNotAllowed } from "../_shared/http.ts";
import { assertAdmin, getServiceClient, requireUser } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/email.ts";
import { createNotification } from "../_shared/notifications.ts";
import { requireNonEmptyString } from "../_shared/validators.ts";

type MoveToPhase2Body = {
  user_id: string;
  submission_id: string;
  phase2_sentence: string;
};

Deno.serve(async (req) => {
  try {
    const pre = preflight(req);
    if (pre) return pre;

    if (req.method !== "POST") {
      throw methodNotAllowed();
    }

    const { user } = await requireUser(req);
    const body = await readJson<MoveToPhase2Body>(req);

    const userId = requireNonEmptyString(body.user_id, "user_id");
    const submissionId = requireNonEmptyString(body.submission_id, "submission_id");
    const phase2Sentence = requireNonEmptyString(body.phase2_sentence, "phase2_sentence");

    const service = getServiceClient();
    await assertAdmin(service, user.id);

    const { data: submission, error: submissionError } = await service
      .from("teacher_phase1_submissions")
      .select("id, user_id, status")
      .eq("id", submissionId)
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .single();

    if (submissionError || !submission) {
      throw new HttpError(404, "Phase 1 submission not found");
    }

    if (submission.status !== "pending") {
      throw new HttpError(409, "Only pending Phase 1 submissions can be moved to Phase 2");
    }

    const nowIso = new Date().toISOString();

    const { error: phase1UpdateError } = await service
      .from("teacher_phase1_submissions")
      .update({
        status: "moved_to_phase2",
        reject_reason: null,
        admin_notes: null,
        reviewed_at: nowIso,
        reviewed_by: user.id,
      })
      .eq("id", submission.id);

    if (phase1UpdateError) {
      throw new HttpError(500, "Failed to update Phase 1 submission", phase1UpdateError.message);
    }

    const { data: phase2Task, error: taskUpsertError } = await service
      .from("teacher_phase2_tasks")
      .upsert(
        {
          user_id: userId,
          phase2_sentence: phase2Sentence,
          status: "assigned",
          attempts_allowed: 3,
          last_feedback: null,
          closed_at: null,
          created_by: user.id,
          updated_at: nowIso,
        },
        { onConflict: "user_id" },
      )
      .select("id, user_id, phase2_sentence, status, attempts_allowed, current_attempts")
      .single();

    if (taskUpsertError || !phase2Task) {
      throw new HttpError(500, "Failed to create/update Phase 2 task", taskUpsertError?.message);
    }

    const { error: profileUpdateError } = await service
      .from("profiles")
      .update({ current_phase: "phase2" })
      .eq("user_id", userId);

    if (profileUpdateError) {
      throw new HttpError(500, "Failed to update profile phase", profileUpdateError.message);
    }

    await createNotification(service, {
      user_id: userId,
      type: "phase2",
      title: "Presli ste u fazu 2",
      body: "Postovani, hvala sto ste aplicirali. Presli ste u phase 2. Udjite u aplikaciju za sledeci korak.",
      payload: {
        phase2_task_id: phase2Task.id,
      },
    });

    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select("email")
      .eq("user_id", userId)
      .single();

    if (!profileError && profile?.email) {
      await sendEmail({
        to: profile.email,
        subject: "Presli ste u fazu 2",
        text:
          "Postovani, hvala sto ste aplicirali. Presli ste u phase 2. Udjite u aplikaciju za sledeci korak.",
      });
    }

    await service.from("analytics_events").insert({
      session_id: `admin-${user.id}`,
      user_id: userId,
      event_name: "phase1_passed",
      metadata: {
        submission_id: submission.id,
        phase2_task_id: phase2Task.id,
        reviewed_by: user.id,
      },
    });

    return json({ ok: true, phase2_task: phase2Task });
  } catch (error) {
    return handleError(error);
  }
});

