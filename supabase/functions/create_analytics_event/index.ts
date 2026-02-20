import { json, readJson, handleError, HttpError, preflight, methodNotAllowed } from "../_shared/http.ts";
import { getServiceClient, getUserClient } from "../_shared/supabase.ts";
import { requireNonEmptyString } from "../_shared/validators.ts";

type AnalyticsBody = {
  event_name: string;
  session_id: string;
  metadata?: Record<string, unknown>;
};

const allowedEvents = new Set([
  "visits",
  "started_signup",
  "phase1_submitted",
  "phase1_passed",
  "phase2_submitted",
  "accepted",
  "click_cta",
]);

Deno.serve(async (req) => {
  try {
    const pre = preflight(req);
    if (pre) return pre;

    if (req.method !== "POST") {
      throw methodNotAllowed();
    }

    const body = await readJson<AnalyticsBody>(req);
    const eventName = requireNonEmptyString(body.event_name, "event_name");
    const sessionId = requireNonEmptyString(body.session_id, "session_id");
    const metadata = body.metadata ?? {};

    if (!allowedEvents.has(eventName)) {
      throw new HttpError(400, "event_name is not allowed");
    }

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");

    if (authHeader) {
      const userClient = getUserClient(req);
      const { data } = await userClient.auth.getUser();
      if (data?.user?.id) {
        userId = data.user.id;
      }
    }

    const service = getServiceClient();
    const { data: inserted, error } = await service
      .from("analytics_events")
      .insert({
        event_name: eventName,
        session_id: sessionId,
        user_id: userId,
        metadata,
      })
      .select("id, event_name, session_id, user_id, created_at")
      .single();

    if (error) {
      throw new HttpError(500, "Failed to insert analytics event", error.message);
    }

    return json({ ok: true, event: inserted });
  } catch (error) {
    return handleError(error);
  }
});

