export const dynamic = "force-dynamic";

import { toErrorResponse } from "@/src/server/http/errors";
import { requireAdmin } from "@/src/server/auth/session";
import { runStorageCleanup } from "@/src/server/services/adminService";

export async function POST() {
  try {
    await requireAdmin();
    const data = await runStorageCleanup();
    return Response.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}


