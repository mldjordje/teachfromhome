import { json, readJson, handleError, HttpError } from "../_shared/http.ts";
import { getServiceClient, requireUser } from "../_shared/supabase.ts";
import { createNotification } from "../_shared/notifications.ts";
import { requireNonEmptyString } from "../_shared/validators.ts";

type ApplyReferralBody = {
  referral_code: string;
};

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const { user } = await requireUser(req);
    const body = await readJson<ApplyReferralBody>(req);

    const referralCode = requireNonEmptyString(body.referral_code, "referral_code").toUpperCase();
    const service = getServiceClient();

    const { data: ownProfile, error: ownProfileError } = await service
      .from("profiles")
      .select("user_id, referred_by_code")
      .eq("user_id", user.id)
      .single();

    if (ownProfileError || !ownProfile) {
      throw new HttpError(404, "Profile not found");
    }

    if (ownProfile.referred_by_code) {
      throw new HttpError(409, "Referral code is already applied for this account");
    }

    const { data: referrerProfile, error: referrerError } = await service
      .from("profiles")
      .select("user_id, referral_code")
      .eq("referral_code", referralCode)
      .single();

    if (referrerError || !referrerProfile) {
      throw new HttpError(404, "Referral code is invalid");
    }

    if (referrerProfile.user_id === user.id) {
      throw new HttpError(400, "You cannot apply your own referral code");
    }

    const { error: profileUpdateError } = await service
      .from("profiles")
      .update({
        referred_by_code: referralCode,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .is("referred_by_code", null);

    if (profileUpdateError) {
      throw new HttpError(500, "Failed to apply referral code", profileUpdateError.message);
    }

    const { data: link, error: linkError } = await service
      .from("referral_links")
      .upsert(
        {
          referrer_id: referrerProfile.user_id,
          referred_id: user.id,
        },
        { onConflict: "referred_id" },
      )
      .select("id, referrer_id, referred_id, created_at")
      .single();

    if (linkError || !link) {
      throw new HttpError(500, "Failed to create referral link", linkError?.message);
    }

    await createNotification(service, {
      user_id: user.id,
      type: "referral",
      title: "Referral code applied",
      body: "Your referral code has been linked successfully.",
      payload: { referrer_id: referrerProfile.user_id, referral_code: referralCode },
    });

    await createNotification(service, {
      user_id: referrerProfile.user_id,
      type: "referral",
      title: "New referral linked",
      body: "A new teacher account has been linked with your referral code.",
      payload: { referred_user_id: user.id },
    });

    return json({
      ok: true,
      referral_link: link,
    });
  } catch (error) {
    return handleError(error);
  }
});
