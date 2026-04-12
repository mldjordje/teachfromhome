export const dynamic = "force-dynamic";

import { handleUpload } from "@vercel/blob/client";
import { toErrorResponse } from "@/src/server/http/errors";
import { getAuthUser } from "@/src/server/auth/session";
import { getUploadPolicy, parseUploadPayload } from "@/src/server/services/blobService";

export async function POST(request) {
  try {
    const body = await request.json();

    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const auth = await getAuthUser();
        const payload = parseUploadPayload(clientPayload);
        return getUploadPolicy({
          pathname,
          payload,
          userId: auth.user.id,
          isAdmin: auth.isAdmin,
        });
      },
      onUploadCompleted: async () => {
        // Optional hook for post-upload side effects.
      },
    });

    return Response.json(response);
  } catch (error) {
    return toErrorResponse(error);
  }
}


