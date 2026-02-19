import { json, readJson, handleError, HttpError } from "../_shared/http.ts";
import { assertAdmin, getServiceClient, requireUser } from "../_shared/supabase.ts";
import { createNotification } from "../_shared/notifications.ts";
import { requireNonEmptyString } from "../_shared/validators.ts";

type ApproveReferralBody = {
  reward_id: string;
};

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const { user } = await requireUser(req);
    const body = await readJson<ApproveReferralBody>(req);

    const rewardId = requireNonEmptyString(body.reward_id, "reward_id");

    const service = getServiceClient();
    await assertAdmin(service, user.id);

    const { data: reward, error: rewardLoadError } = await service
      .from("referral_rewards")
      .select("id, referrer_id, referred_id, status")
      .eq("id", rewardId)
      .single();

    if (rewardLoadError || !reward) {
      throw new HttpError(404, "Referral reward not found");
    }

    if (reward.status === "paid") {
      throw new HttpError(409, "Reward is already paid");
    }

    const nowIso = new Date().toISOString();

    const { data: updatedReward, error: updateError } = await service
      .from("referral_rewards")
      .update({
        status: "approved",
        approved_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", reward.id)
      .select("id, referrer_id, referred_id, amount_eur, status, eligible_at, approved_at")
      .single();

    if (updateError || !updatedReward) {
      throw new HttpError(500, "Failed to approve referral reward", updateError?.message);
    }

    await createNotification(service, {
      user_id: reward.referrer_id,
      type: "referral",
      title: "Referral bonus approved",
      body: "Your referral bonus has been approved.",
      payload: { reward_id: reward.id, referred_user_id: reward.referred_id },
    });

    return json({ ok: true, reward: updatedReward });
  } catch (error) {
    return handleError(error);
  }
});
