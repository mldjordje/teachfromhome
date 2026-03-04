export const dynamic = "force-dynamic";

import { getAuthUser } from "@/src/server/auth/session";
import { mapPublicProfile } from "@/src/server/services/authService";
import { toErrorResponse } from "@/src/server/http/errors";

export async function GET() {
  try {
    const auth = await getAuthUser();
    return Response.json({
      user: auth.user,
      profile: mapPublicProfile(auth.profile),
      is_admin: auth.isAdmin,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}


