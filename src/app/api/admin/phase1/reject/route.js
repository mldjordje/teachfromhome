export const dynamic = "force-dynamic";

import { jsonBody, toErrorResponse } from "@/src/server/http/errors";
import { rejectCandidatePhase1 } from "@/src/server/services/adminService";
import { requireAdmin } from "@/src/server/auth/session";

export async function POST(request) {
  try {
    const auth = await requireAdmin();
    const body = await jsonBody(request);

    const result = await rejectCandidatePhase1({
      adminUserId: auth.user.id,
      userId: body.user_id,
      submissionId: body.submission_id,
      reason: body.reason,
      notes: body.notes || null,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}


