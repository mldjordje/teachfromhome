export const dynamic = "force-dynamic";

import { jsonBody, toErrorResponse } from "@/src/server/http/errors";
import { sendCandidateReminder } from "@/src/server/services/adminService";
import { requireAdmin } from "@/src/server/auth/session";

export async function POST(request) {
  try {
    const auth = await requireAdmin();
    const body = await jsonBody(request);

    const result = await sendCandidateReminder({
      adminUserId: auth.user.id,
      userId: body.user_id,
      kind: body.kind,
    });

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

