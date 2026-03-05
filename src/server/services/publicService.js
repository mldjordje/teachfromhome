import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/src/server/db/client";
import { showcaseVideos } from "@/src/server/db/schema";

const mapShowcaseVideo = (row) => ({
  id: row.id,
  source: row.source || (row.storageBlobUrl ? "native" : "youtube"),
  title: row.title,
  youtube_url: row.youtubeUrl,
  youtube_video_id: row.youtubeVideoId,
  thumbnail_url: row.thumbnailUrl,
  storage_blob_key: row.storageBlobKey,
  storage_blob_url: row.storageBlobUrl,
  order_index: row.orderIndex,
  is_active: row.isActive,
  created_at: row.createdAt,
});

export const listPublicShowcaseVideos = async (limit = 0) => {
  let query = db
    .select()
    .from(showcaseVideos)
    .where(eq(showcaseVideos.isActive, true))
    .orderBy(asc(showcaseVideos.orderIndex), desc(showcaseVideos.createdAt));

  if (limit > 0) {
    query = query.limit(limit);
  }

  const rows = await query;
  return rows.map(mapShowcaseVideo);
};
