export const dynamic = "force-dynamic";

import { jsonBody, toErrorResponse } from "@/src/server/http/errors";
import { requireTeacher } from "@/src/server/auth/session";
import { mapPublicProfile } from "@/src/server/services/authService";
import { getTeacherProfileData, updateTeacherProfileData } from "@/src/server/services/teacherService";

export async function GET() {
  try {
    const auth = await requireTeacher();
    const data = await getTeacherProfileData(auth.user.id);

    return Response.json({
      profile: mapPublicProfile(data.profile),
      rewards: (data.rewards || []).map((reward) => ({
        id: reward.id,
        referrer_id: reward.referrerId,
        referred_id: reward.referredId,
        amount_eur: reward.amountEur,
        status: reward.status,
        eligible_at: reward.eligibleAt,
        approved_at: reward.approvedAt,
        paid_at: reward.paidAt,
        notes: reward.notes,
        created_at: reward.createdAt,
      })),
      notifications: data.notifications,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireTeacher();
    const payload = await jsonBody(request);

    const profile = await updateTeacherProfileData({
      userId: auth.user.id,
      email: auth.user.email,
      payload,
    });

    return Response.json({
      ok: true,
      profile: mapPublicProfile(profile),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}


