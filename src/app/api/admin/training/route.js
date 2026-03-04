export const dynamic = "force-dynamic";

import { jsonBody, toErrorResponse } from "@/src/server/http/errors";
import {
  createTrainingVideo,
  deleteTrainingVideo,
  listTrainingVideosAdmin,
  toggleTrainingVideo,
} from "@/src/server/services/adminService";
import { requireAdmin } from "@/src/server/auth/session";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await listTrainingVideosAdmin();
    return Response.json({ rows });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request) {
  try {
    const auth = await requireAdmin();
    const body = await jsonBody(request);

    const row = await createTrainingVideo({
      adminUserId: auth.user.id,
      title: body.title,
      category: body.category,
      orderIndex: body.order_index,
      isActive: body.is_active,
      storageBlobKey: body.storage_blob_key,
      storageBlobUrl: body.storage_blob_url,
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

    await toggleTrainingVideo({
      videoId: body.video_id,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request) {
  try {
    await requireAdmin();
    const body = await jsonBody(request);

    await deleteTrainingVideo({
      videoId: body.video_id,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}


