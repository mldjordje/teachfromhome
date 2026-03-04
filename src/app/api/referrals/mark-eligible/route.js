export const dynamic = "force-dynamic";

import { jsonBody, toErrorResponse } from "@/src/server/http/errors";
import { requireAdmin } from "@/src/server/auth/session";
import { markReferralEligible } from "@/src/server/services/referralService";

export async function POST(request) {
  try {
    const auth = await requireAdmin();
    const payload = await jsonBody(request);

    const reward = await markReferralEligible({
      referredUserId: payload.referred_user_id,
      eligibleAt: payload.eligible_at || null,
      createdBy: auth.user.id,
    });

    return Response.json({ ok: true, reward });
  } catch (error) {
    return toErrorResponse(error);
  }
}


