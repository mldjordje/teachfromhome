export const dynamic = "force-dynamic";

import { jsonBody, toErrorResponse } from "@/src/server/http/errors";
import { requireTeacher } from "@/src/server/auth/session";
import { applyReferralCode } from "@/src/server/services/referralService";

export async function POST(request) {
  try {
    const auth = await requireTeacher();
    const payload = await jsonBody(request);

    const link = await applyReferralCode({
      userId: auth.user.id,
      referralCode: payload.referral_code,
    });

    return Response.json({ ok: true, link });
  } catch (error) {
    return toErrorResponse(error);
  }
}


