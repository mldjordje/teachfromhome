export const dynamic = "force-dynamic";

import { toErrorResponse } from "@/src/server/http/errors";
import { deleteCandidate, getCandidateDetail } from "@/src/server/services/adminService";
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

export async function DELETE(_request, { params }) {
  try {
    const auth = await requireAdmin();
    const result = await deleteCandidate({
      adminUserId: auth.user.id,
      userId: params.userId,
    });
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}


