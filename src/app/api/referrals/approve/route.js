export const dynamic = "force-dynamic";

import { jsonBody, toErrorResponse } from "@/src/server/http/errors";
import { requireAdmin } from "@/src/server/auth/session";
import { approveReferralReward } from "@/src/server/services/referralService";

export async function POST(request) {
  try {
    await requireAdmin();
    const payload = await jsonBody(request);

    const reward = await approveReferralReward({
      rewardId: payload.reward_id,
    });

    return Response.json({ ok: true, reward });
  } catch (error) {
    return toErrorResponse(error);
  }
}


