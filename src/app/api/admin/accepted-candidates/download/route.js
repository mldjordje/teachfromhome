export const dynamic = "force-dynamic";

import { ApiError, toErrorResponse } from "@/src/server/http/errors";
import { getAcceptedCandidateDownload } from "@/src/server/services/adminService";
import { requireAdmin } from "@/src/server/auth/session";

export async function GET(request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get("submissionId") || "";

    const { downloadUrl, fileName } = await getAcceptedCandidateDownload({ submissionId });
    const upstream = await fetch(downloadUrl, { cache: "no-store" });

    if (!upstream.ok || !upstream.body) {
      throw new ApiError(502, "Clip download failed");
    }

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
    headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }
    headers.set("Cache-Control", "no-store");

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
