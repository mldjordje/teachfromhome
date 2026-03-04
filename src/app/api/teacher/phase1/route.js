export const dynamic = "force-dynamic";

import { toErrorResponse } from "@/src/server/http/errors";
import { requireTeacher } from "@/src/server/auth/session";
import { getTeacherPhase1Data } from "@/src/server/services/teacherService";

export async function GET() {
  try {
    const auth = await requireTeacher();
    const data = await getTeacherPhase1Data(auth.user.id);
    return Response.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}


