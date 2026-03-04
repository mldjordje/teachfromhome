import { and, desc, eq } from "drizzle-orm";
import { db } from "@/src/server/db/client";
import { notifications } from "@/src/server/db/schema";

export const createNotification = async ({ userId, type = "info", title, body, payload = {} }) => {
  const [row] = await db
    .insert(notifications)
    .values({
      userId,
      type,
      title,
      body,
      payload,
    })
    .returning();

  return row;
};

export const listNotificationsForUser = async (userId) => {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
};

export const markNotificationRead = async ({ userId, notificationId }) => {
  await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
};

export const markAllNotificationsRead = async (userId) => {
  await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
};
