export const dynamic = "force-dynamic";

import { toErrorResponse } from "@/src/server/http/errors";
import { requireTeacher } from "@/src/server/auth/session";
import { markAllNotificationsRead } from "@/src/server/services/notificationService";

export async function POST() {
  try {
    const auth = await requireTeacher();
    await markAllNotificationsRead(auth.user.id);
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}


