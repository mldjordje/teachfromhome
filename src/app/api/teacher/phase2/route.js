export const dynamic = "force-dynamic";

import { jsonBody, toErrorResponse } from "@/src/server/http/errors";
import { requireTeacher } from "@/src/server/auth/session";
import { getTeacherPhase2Data, markTrainingVideoViewed } from "@/src/server/services/teacherService";

export async function GET() {
  try {
    const auth = await requireTeacher();
    const data = await getTeacherPhase2Data(auth.user.id);
    return Response.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireTeacher();
    const payload = await jsonBody(request);

    if (payload.action === "mark_video_viewed") {
      await markTrainingVideoViewed({
        userId: auth.user.id,
        trainingVideoId: payload.training_video_id,
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    return toErrorResponse(error);
  }
}


