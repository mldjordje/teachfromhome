export const dynamic = "force-dynamic";

import { toErrorResponse } from "@/src/server/http/errors";
import { listPublicShowcaseVideos } from "@/src/server/services/publicService";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 0);
    const rows = await listPublicShowcaseVideos(Number.isFinite(limit) ? limit : 0);
    return Response.json({ rows });
  } catch (error) {
    return toErrorResponse(error);
  }
}


