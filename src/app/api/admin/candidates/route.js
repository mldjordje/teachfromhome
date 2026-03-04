export const dynamic = "force-dynamic";

import { parsePagination, toErrorResponse } from "@/src/server/http/errors";
import { listCandidates } from "@/src/server/services/adminService";
import { requireAdmin } from "@/src/server/auth/session";

export async function GET(request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const { page, pageSize } = parsePagination(searchParams, { page: 1, pageSize: 20, maxPageSize: 100 });

    const data = await listCandidates({
      status: searchParams.get("status") || "all",
      phase: searchParams.get("phase") || "all",
      q: searchParams.get("q") || "",
      page,
      pageSize,
    });

    return Response.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}


