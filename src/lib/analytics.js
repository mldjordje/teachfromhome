import { callEdgeFunction } from "@library/edgeClient";

const SESSION_KEY = "tfh_session_id";
const VISIT_PREFIX = "tfh_visit_once";

export const getAnalyticsSessionId = () => {
  if (typeof window === "undefined") {
    return "server-session";
  }

  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }

  const generated = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(SESSION_KEY, generated);
  return generated;
};

export const trackEvent = async ({ eventName, metadata = {} }) => {
  try {
    await callEdgeFunction({
      functionName: "create_analytics_event",
      body: {
        event_name: eventName,
        session_id: getAnalyticsSessionId(),
        metadata,
      },
    });
  } catch (error) {
    console.warn("trackEvent failed", error);
  }
};

export const trackVisitOnce = async ({ page, metadata = {} }) => {
  if (typeof window === "undefined") return;

  const normalizedPage = String(page || "").trim() || "unknown";
  const visitKey = `${VISIT_PREFIX}:${normalizedPage}`;

  try {
    const store = window.sessionStorage;
    if (store.getItem(visitKey)) {
      return;
    }

    store.setItem(visitKey, "1");
    await trackEvent({
      eventName: "visits",
      metadata: {
        page: normalizedPage,
        ...metadata,
      },
    });
  } catch (error) {
    console.warn("trackVisitOnce failed", error);
  }
};
