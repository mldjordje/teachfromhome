export const dynamic = "force-dynamic";

import { toErrorResponse } from "@/src/server/http/errors";
import { getCandidateDetail } from "@/src/server/services/adminService";
import { requireAdmin } from "@/src/server/auth/session";

export async function GET(_request, { params }) {
  try {
    await requireAdmin();
    const data = await getCandidateDetail(params.userId);
    return Response.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}


