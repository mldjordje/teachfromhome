export const dynamic = "force-dynamic";

import { toErrorResponse } from "@/src/server/http/errors";
import { runStorageCleanup } from "@/src/server/services/adminService";

const isAuthorized = (request) => {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false;

  const header = request.headers.get("x-cron-secret") || "";
  const bearer = request.headers.get("authorization") || "";

  if (header && header === secret) return true;
  if (bearer === `Bearer ${secret}`) return true;
  return false;
};

export async function GET(request) {
  try {
    if (!isAuthorized(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runStorageCleanup();
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}


