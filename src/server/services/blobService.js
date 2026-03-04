import { phaseLimits } from "@/src/server/services/storageService";
import { ApiError } from "@/src/server/http/errors";

const ALLOWED_CONTENT_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export const parseUploadPayload = (clientPayloadRaw) => {
  if (!clientPayloadRaw) {
    return { kind: "unknown" };
  }

  try {
    return JSON.parse(clientPayloadRaw);
  } catch {
    throw new ApiError(400, "Invalid upload payload");
  }
};

export const getUploadPolicy = ({ pathname, payload, userId, isAdmin }) => {
  if (!pathname || typeof pathname !== "string") {
    throw new ApiError(400, "Invalid pathname");
  }

  if (pathname.startsWith(`phase1/${userId}/`)) {
    return {
      maximumSizeInBytes: phaseLimits.phase1,
      allowedContentTypes: ALLOWED_CONTENT_TYPES,
      tokenPayload: JSON.stringify({
        owner_id: userId,
        kind: "phase1",
      }),
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60,
    };
  }

  if (pathname.startsWith(`phase2/${userId}/`)) {
    return {
      maximumSizeInBytes: phaseLimits.phase2,
      allowedContentTypes: ALLOWED_CONTENT_TYPES,
      tokenPayload: JSON.stringify({
        owner_id: userId,
        kind: "phase2",
      }),
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60,
    };
  }

  if (pathname.startsWith("training/") && isAdmin) {
    return {
      maximumSizeInBytes: phaseLimits.training,
      allowedContentTypes: ALLOWED_CONTENT_TYPES,
      tokenPayload: JSON.stringify({
        owner_id: userId,
        kind: "training",
      }),
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60,
    };
  }

  throw new ApiError(403, "Upload path is not allowed");
};
