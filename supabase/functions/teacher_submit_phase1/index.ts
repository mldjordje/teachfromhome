import { json, readJson, handleError, HttpError, preflight, methodNotAllowed } from "../_shared/http.ts";
import { getServiceClient, requireUser } from "../_shared/supabase.ts";
import { removeStorageObjectSafe, validateOwnedVideoObject } from "../_shared/storage.ts";
import {
  requireDate,
  requireEmail,
  requireMaxLength,
  requireNonEmptyString,
  requirePhone,
  requireVideoPath,
} from "../_shared/validators.ts";
import { createNotification } from "../_shared/notifications.ts";

type Phase1Body = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  age?: number;
  phone: string;
  email: string;
  short_about: string;
  video_path: string;
  script_text?: string;
};

const PHASE1_MAX_VIDEO_MB = Number(Deno.env.get("PHASE1_MAX_VIDEO_MB") ?? "25");
const PHASE1_MAX_VIDEO_BYTES = PHASE1_MAX_VIDEO_MB * 1024 * 1024;

Deno.serve(async (req) => {
  let cleanupTarget: { bucket: string; objectPath: string } | null = null;
  let shouldCleanup = false;
  let service: ReturnType<typeof getServiceClient> | null = null;

  try {
    const pre = preflight(req);
    if (pre) return pre;

    if (req.method !== "POST") {
      throw methodNotAllowed();
    }

    const { user } = await requireUser(req);
    const body = await readJson<Phase1Body>(req);

    const firstName = requireNonEmptyString(body.first_name, "first_name");
    const lastName = requireNonEmptyString(body.last_name, "last_name");
    const dateOfBirth = requireDate(body.date_of_birth, "date_of_birth");
    const phone = requirePhone(body.phone);
    const email = requireEmail(body.email);
    const shortAbout = requireMaxLength(
      requireNonEmptyString(body.short_about, "short_about"),
      50,
      "short_about",
    );
    const videoPath = requireVideoPath(body.video_path);
    const scriptText = body.script_text?.trim().length
      ? body.script_text.trim()
      : "Please introduce yourself in 4-5 sentences.";

    if (!user.email || email !== user.email.toLowerCase()) {
      throw new HttpError(400, "email must match auth user email");
    }

    service = getServiceClient();
    cleanupTarget = await validateOwnedVideoObject({
      service,
      userId: user.id,
      fullPath: videoPath,
      expectedBucket: "phase1-videos",
      maxBytes: PHASE1_MAX_VIDEO_BYTES,
    });
    shouldCleanup = true;

    const { data: existingAttempts, error: attemptsError } = await service
      .from("teacher_phase1_submissions")
      .select("id, attempt_no, status")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .order("attempt_no", { ascending: true });

    if (attemptsError) {
      throw new HttpError(500, "Failed to load phase1 attempts", attemptsError.message);
    }

    const attempts = existingAttempts ?? [];
    const pendingExists = attempts.some((row) => row.status === "pending");
    const movedToPhase2 = attempts.some((row) => row.status === "moved_to_phase2");

    if (pendingExists) {
      throw new HttpError(409, "You already have a pending Phase 1 submission");
    }

    if (movedToPhase2) {
      throw new HttpError(409, "You already passed Phase 1");
    }

    if (attempts.length >= 3) {
      throw new HttpError(400, "Maximum 3 Phase 1 attempts reached");
    }

    const attemptNo = attempts.length + 1;

    const { error: profileError } = await service.from("profiles").upsert(
      {
        user_id: user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        date_of_birth: dateOfBirth,
        short_about: shortAbout,
        current_phase: "phase1",
      },
      { onConflict: "user_id" },
    );

    if (profileError) {
      throw new HttpError(500, "Failed to upsert profile", profileError.message);
    }

    const { data: insertedSubmission, error: insertError } = await service
      .from("teacher_phase1_submissions")
      .insert({
        user_id: user.id,
        attempt_no: attemptNo,
        video_path: videoPath,
        script_text: scriptText,
        status: "pending",
      })
      .select("id, user_id, attempt_no, status, created_at")
      .single();

    if (insertError) {
      throw new HttpError(500, "Failed to create Phase 1 submission", insertError.message);
    }

    shouldCleanup = false;

    try {
      await createNotification(service, {
        user_id: user.id,
        type: "phase1",
        title: "Phase 1 submitted",
        body: "Your Phase 1 application has been submitted and is pending review.",
        payload: { submission_id: insertedSubmission.id, attempt_no: attemptNo },
      });
    } catch (_notificationError) {
      // Keep submission successful even if notification write fails.
    }

    return json({
      ok: true,
      submission: insertedSubmission,
    });
  } catch (error) {
    if (shouldCleanup && cleanupTarget && service) {
      await removeStorageObjectSafe(service, cleanupTarget.bucket, cleanupTarget.objectPath);
    }
    return handleError(error);
  }
});

