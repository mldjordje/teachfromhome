import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/src/server/db/client";
import { showcaseVideos } from "@/src/server/db/schema";

export const listPublicShowcaseVideos = async (limit = 0) => {
  let query = db
    .select()
    .from(showcaseVideos)
    .where(eq(showcaseVideos.isActive, true))
    .orderBy(asc(showcaseVideos.orderIndex), desc(showcaseVideos.createdAt));

  if (limit > 0) {
    query = query.limit(limit);
  }

  return query;
};
