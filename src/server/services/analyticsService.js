import { analyticsEvents } from "@/src/server/db/schema";
import { db } from "@/src/server/db/client";

export const createAnalyticsEvent = async ({ sessionId, userId = null, eventName, metadata = {} }) => {
  const [row] = await db
    .insert(analyticsEvents)
    .values({
      sessionId,
      userId,
      eventName,
      metadata,
    })
    .returning();

  return row;
};
