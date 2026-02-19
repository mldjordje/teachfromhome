import { json, readJson, handleError, HttpError } from "../_shared/http.ts";
import { assertAdmin, getServiceClient, requireUser } from "../_shared/supabase.ts";
import { createNotification } from "../_shared/notifications.ts";
import { requireDate, requireNonEmptyString } from "../_shared/validators.ts";

type MarkReferralEligibleBody = {
  referred_user_id: string;
  eligible_at?: string;
};

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const { user } = await requireUser(req);
    const body = await readJson<MarkReferralEligibleBody>(req);

    const referredUserId = requireNonEmptyString(body.referred_user_id, "referred_user_id");
    const eligibleAt = body.eligible_at ? requireDate(body.eligible_at, "eligible_at") : new Date().toISOString();

    const service = getServiceClient();
    await assertAdmin(service, user.id);

    const { data: referredProfile, error: referredProfileError } = await service
      .from("profiles")
      .select("user_id, current_phase")
      .eq("user_id", referredUserId)
      .single();

    if (referredProfileError || !referredProfile) {
      throw new HttpError(404, "Referred user profile not found");
    }

    if (referredProfile.current_phase !== "accepted") {
      throw new HttpError(400, "Referred user must be accepted before referral eligibility");
    }

    const { data: link, error: linkError } = await service
      .from("referral_links")
      .select("id, referrer_id, referred_id")
      .eq("referred_id", referredUserId)
      .single();

    if (linkError || !link) {
      throw new HttpError(404, "Referral link not found for referred user");
    }

    const { data: reward, error: rewardError } = await service
      .from("referral_rewards")
      .upsert(
        {
          referrer_id: link.referrer_id,
          referred_id: link.referred_id,
          amount_eur: 20,
          status: "pending",
          eligible_at: new Date(eligibleAt).toISOString(),
          created_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "referred_id" },
      )
      .select("id, referrer_id, referred_id, amount_eur, status, eligible_at")
      .single();

    if (rewardError || !reward) {
      throw new HttpError(500, "Failed to create/update referral reward", rewardError?.message);
    }

    await createNotification(service, {
      user_id: link.referrer_id,
      type: "referral",
      title: "Referral bonus pending",
      body: "Your referral bonus has been marked as eligible and is pending admin approval.",
      payload: { reward_id: reward.id, referred_user_id: link.referred_id },
    });

    return json({ ok: true, reward });
  } catch (error) {
    return handleError(error);
  }
});
