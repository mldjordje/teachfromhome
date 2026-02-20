import { json, readJson, handleError, HttpError, preflight, methodNotAllowed } from "../_shared/http.ts";
import { assertAdmin, getServiceClient, requireUser } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/email.ts";
import { createNotification } from "../_shared/notifications.ts";
import { requireAllowed, requireNonEmptyString } from "../_shared/validators.ts";

type RejectPhase1Body = {
  user_id: string;
  submission_id: string;
  reason: "bad_accent" | "bad_pronunciation" | "low_energy";
  notes?: string;
};

Deno.serve(async (req) => {
  try {
    const pre = preflight(req);
    if (pre) return pre;

    if (req.method !== "POST") {
      throw methodNotAllowed();
    }

    const { user } = await requireUser(req);
    const body = await readJson<RejectPhase1Body>(req);

    const userId = requireNonEmptyString(body.user_id, "user_id");
    const submissionId = requireNonEmptyString(body.submission_id, "submission_id");
    const reason = requireAllowed(body.reason, ["bad_accent", "bad_pronunciation", "low_energy"] as const, "reason");
    const notes = body.notes?.trim() || null;

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
      throw new HttpError(409, "Only pending Phase 1 submissions can be rejected");
    }

    const nowIso = new Date().toISOString();

    const { error: updateError } = await service
      .from("teacher_phase1_submissions")
      .update({
        status: "rejected",
        reject_reason: reason,
        admin_notes: notes,
        reviewed_at: nowIso,
        reviewed_by: user.id,
      })
      .eq("id", submission.id);

    if (updateError) {
      throw new HttpError(500, "Failed to reject Phase 1 submission", updateError.message);
    }

    const { count: attemptCount } = await service
      .from("teacher_phase1_submissions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_deleted", false);

    const attemptsLeft = Math.max(0, 3 - (attemptCount ?? 0));

    await createNotification(service, {
      user_id: userId,
      type: "phase1",
      title: "Phase 1 review result",
      body: `Your Phase 1 submission was rejected (${reason}). Attempts left: ${attemptsLeft}.`,
      payload: {
        submission_id: submission.id,
        reason,
        notes,
        attempts_left: attemptsLeft,
      },
    });

    const { data: profile } = await service
      .from("profiles")
      .select("email")
      .eq("user_id", userId)
      .single();

    if (profile?.email) {
      await sendEmail({
        to: profile.email,
        subject: "Phase 1 rezultat",
        text: `Vasa Phase 1 prijava je odbijena (razlog: ${reason}). ${notes ? `Napomena: ${notes}` : ""}`,
      });
    }

    return json({ ok: true, attempts_left: attemptsLeft });
  } catch (error) {
    return handleError(error);
  }
});

