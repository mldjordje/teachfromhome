export const dynamic = "force-dynamic";

import { toErrorResponse } from "@/src/server/http/errors";
import { requireTeacher } from "@/src/server/auth/session";
import { getTeacherDashboardData } from "@/src/server/services/teacherService";

export async function GET() {
  try {
    const auth = await requireTeacher();
    const data = await getTeacherDashboardData(auth.user.id);
    return Response.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}


