import { del, getDownloadUrl, list } from "@vercel/blob";

const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export const phaseLimits = {
  phase1: 25 * 1024 * 1024,
  phase2: 35 * 1024 * 1024,
  training: 100 * 1024 * 1024,
  showcase: 100 * 1024 * 1024,
};

export const getAllowedVideoMimeTypes = () => VIDEO_MIME_TYPES;

export const removeBlobSafe = async (blobUrlOrPathname) => {
  if (!blobUrlOrPathname) return false;

  try {
    await del(blobUrlOrPathname);
    return true;
  } catch (error) {
    console.warn("removeBlobSafe failed", error?.message || error);
    return false;
  }
};

export const getBlobPreviewUrl = async (blobUrlOrPathname) => {
  if (!blobUrlOrPathname) return null;

  try {
    const downloadUrl = await getDownloadUrl(blobUrlOrPathname);
    return downloadUrl;
  } catch (error) {
    console.warn("getBlobPreviewUrl failed", error?.message || error);
    return blobUrlOrPathname;
  }
};

export const listBlobKeys = async ({ prefix = "", limit = 1000, cursor = undefined }) => {
  return list({ prefix, limit, cursor });
};

export const isVideoContentTypeAllowed = (contentType) => {
  if (!contentType) return true;
  return VIDEO_MIME_TYPES.includes(contentType);
};

export const parseBlobUrl = (url) => {
  if (!url || typeof url !== "string") return null;

  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\/+/, "");
  } catch {
    return url.replace(/^\/+/, "");
  }
};

export const getPhaseFromBlobPath = (pathname) => {
  if (!pathname) return null;
  if (pathname.startsWith("phase1/")) return "phase1";
  if (pathname.startsWith("phase2/")) return "phase2";
  if (pathname.startsWith("training/")) return "training";
  if (pathname.startsWith("showcase/")) return "showcase";
  return null;
};
