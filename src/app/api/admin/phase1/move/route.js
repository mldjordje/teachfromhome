export const dynamic = "force-dynamic";

import { jsonBody, toErrorResponse } from "@/src/server/http/errors";
import { moveCandidateToPhase2 } from "@/src/server/services/adminService";
import { requireAdmin } from "@/src/server/auth/session";

export async function POST(request) {
  try {
    const auth = await requireAdmin();
    const body = await jsonBody(request);

    const result = await moveCandidateToPhase2({
      adminUserId: auth.user.id,
      userId: body.user_id,
      submissionId: body.submission_id,
      phase2Sentence: body.phase2_sentence,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}


