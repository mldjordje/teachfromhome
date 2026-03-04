export const dynamic = "force-dynamic";

import { parsePagination, toErrorResponse } from "@/src/server/http/errors";
import { listAdminPhase1Queue } from "@/src/server/services/adminService";
import { requireAdmin } from "@/src/server/auth/session";

export async function GET(request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const { page, pageSize } = parsePagination(searchParams, { page: 1, pageSize: 20, maxPageSize: 100 });
    const status = searchParams.get("status") || "pending";

    const data = await listAdminPhase1Queue({
      status,
      page,
      pageSize,
    });

    return Response.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}


