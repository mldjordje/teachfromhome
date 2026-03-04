export const dynamic = "force-dynamic";

import { toErrorResponse } from "@/src/server/http/errors";
import { requireTeacher } from "@/src/server/auth/session";
import { markNotificationRead } from "@/src/server/services/notificationService";

export async function PATCH(_request, { params }) {
  try {
    const auth = await requireTeacher();
    await markNotificationRead({
      userId: auth.user.id,
      notificationId: params.id,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}


