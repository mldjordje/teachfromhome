export const dynamic = "force-dynamic";

import { jsonBody, toErrorResponse } from "@/src/server/http/errors";
import { requireTeacher } from "@/src/server/auth/session";
import { submitTeacherPhase1 } from "@/src/server/services/teacherService";
import { removeBlobSafe } from "@/src/server/services/storageService";

export async function POST(request) {
  let payload = null;
  try {
    const auth = await requireTeacher();
    payload = await jsonBody(request);

    const result = await submitTeacherPhase1({
      userId: auth.user.id,
      authEmail: auth.user.email,
      firstName: payload.first_name,
      lastName: payload.last_name,
      dateOfBirth: payload.date_of_birth,
      phone: payload.phone,
      email: payload.email,
      shortAbout: payload.short_about,
      videoBlobKey: payload.video_blob_key,
      videoBlobUrl: payload.video_blob_url,
      sessionId: payload.session_id || null,
    });

    return Response.json({ ok: true, ...result });
  } catch (error) {
    const fallbackBlob = payload?.video_blob_url || payload?.video_blob_key;
    if (fallbackBlob) {
      await removeBlobSafe(fallbackBlob);
    }
    return toErrorResponse(error);
  }
}


