export const dynamic = "force-dynamic";

import { jsonBody, requireNonEmptyString, toErrorResponse } from "@/src/server/http/errors";
import { createAnalyticsEvent } from "@/src/server/services/analyticsService";
import { getAuthUser } from "@/src/server/auth/session";

export async function POST(request) {
  try {
    const payload = await jsonBody(request);
    const eventName = requireNonEmptyString(payload.event_name, "event_name");
    const sessionId = requireNonEmptyString(payload.session_id, "session_id");

    let userId = null;
    try {
      const auth = await getAuthUser();
      userId = auth.user.id;
    } catch (_error) {
      userId = null;
    }

    const row = await createAnalyticsEvent({
      sessionId,
      userId,
      eventName,
      metadata: payload.metadata || {},
    });

    return Response.json({
      ok: true,
      event: {
        id: row.id,
        event_name: row.eventName,
        session_id: row.sessionId,
        user_id: row.userId,
        created_at: row.createdAt,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}


