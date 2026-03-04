export const dynamic = "force-dynamic";

import { jsonBody, toErrorResponse } from "@/src/server/http/errors";
import { deletePhase1SubmissionVideo } from "@/src/server/services/adminService";
import { requireAdmin } from "@/src/server/auth/session";

export async function DELETE(request) {
  try {
    const auth = await requireAdmin();
    const body = await jsonBody(request);

    const result = await deletePhase1SubmissionVideo({
      adminUserId: auth.user.id,
      userId: body.user_id,
      submissionId: body.submission_id,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
