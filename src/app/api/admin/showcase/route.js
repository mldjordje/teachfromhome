export const dynamic = "force-dynamic";

import { jsonBody, toErrorResponse } from "@/src/server/http/errors";
import {
  createShowcaseVideo,
  deleteShowcaseVideo,
  listShowcaseVideosAdmin,
  toggleShowcaseVideo,
} from "@/src/server/services/adminService";
import { requireAdmin } from "@/src/server/auth/session";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await listShowcaseVideosAdmin();
    return Response.json({ rows });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request) {
  try {
    const auth = await requireAdmin();
    const body = await jsonBody(request);

    const row = await createShowcaseVideo({
      adminUserId: auth.user.id,
      title: body.title,
      source: body.source || null,
      youtubeUrl: body.youtube_url,
      youtubeVideoId: body.youtube_video_id,
      thumbnailUrl: body.thumbnail_url || null,
      storageBlobKey: body.storage_blob_key || null,
      storageBlobUrl: body.storage_blob_url || null,
      orderIndex: body.order_index,
      isActive: body.is_active,
    });

    return Response.json({ ok: true, row });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request) {
  try {
    await requireAdmin();
    const body = await jsonBody(request);

    await toggleShowcaseVideo({ videoId: body.video_id });

    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request) {
  try {
    await requireAdmin();
    const body = await jsonBody(request);

    await deleteShowcaseVideo({ videoId: body.video_id });

    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}


