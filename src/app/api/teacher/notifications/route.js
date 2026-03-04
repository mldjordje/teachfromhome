export const dynamic = "force-dynamic";

import { toErrorResponse } from "@/src/server/http/errors";
import { requireTeacher } from "@/src/server/auth/session";
import { listNotificationsForUser } from "@/src/server/services/notificationService";

export async function GET() {
  try {
    const auth = await requireTeacher();
    const rows = await listNotificationsForUser(auth.user.id);
    return Response.json({
      rows: rows.map((row) => ({
        id: row.id,
        user_id: row.userId,
        type: row.type,
        title: row.title,
        body: row.body,
        payload: row.payload,
        is_read: row.isRead,
        created_at: row.createdAt,
        read_at: row.readAt,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}


