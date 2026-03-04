export const dynamic = "force-dynamic";

import { jsonBody, toErrorResponse } from "@/src/server/http/errors";
import { reviewPhase2Task } from "@/src/server/services/adminService";
import { requireAdmin } from "@/src/server/auth/session";

export async function POST(request) {
  try {
    const auth = await requireAdmin();
    const body = await jsonBody(request);

    const result = await reviewPhase2Task({
      adminUserId: auth.user.id,
      action: body.action,
      taskId: body.task_id,
      submissionId: body.submission_id,
      feedback: body.feedback || null,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}


