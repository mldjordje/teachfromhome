import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { HttpError } from "./http.ts";

export type ParsedStoragePath = {
  bucket: string;
  objectPath: string;
};

type ValidateOwnedVideoInput = {
  service: SupabaseClient;
  userId: string;
  fullPath: string;
  expectedBucket: string;
  maxBytes: number;
};

type StorageObjectRow = {
  bucket_id: string;
  name: string;
  metadata: Record<string, unknown> | null;
};

export function parseStoragePath(fullPath: string, field = "video_path"): ParsedStoragePath {
  const normalized = fullPath.trim().replace(/^\/+/, "");
  const [bucket, ...parts] = normalized.split("/");

  if (!bucket || parts.length === 0) {
    throw new HttpError(400, `${field} must include bucket/object path`);
  }

  const objectPath = parts.join("/");
  if (!objectPath) {
    throw new HttpError(400, `${field} object path is empty`);
  }

  return { bucket, objectPath };
}

function parseObjectSizeBytes(metadata: Record<string, unknown> | null): number {
  const raw = metadata?.size ?? metadata?.file_size ?? metadata?.contentLength;
  const parsed = typeof raw === "number" ? raw : Number(raw ?? NaN);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : NaN;
}

export async function validateOwnedVideoObject(input: ValidateOwnedVideoInput): Promise<ParsedStoragePath> {
  const { service, userId, fullPath, expectedBucket, maxBytes } = input;
  const parsed = parseStoragePath(fullPath);

  if (parsed.bucket !== expectedBucket) {
    throw new HttpError(400, `video_path must target bucket ${expectedBucket}`);
  }

  const ownerFolder = parsed.objectPath.split("/")[0];
  if (ownerFolder !== userId) {
    throw new HttpError(403, "You can upload videos only to your own storage folder");
  }

  const { data: objectRow, error: objectError } = await service
    .schema("storage")
    .from("objects")
    .select("bucket_id,name,metadata")
    .eq("bucket_id", parsed.bucket)
    .eq("name", parsed.objectPath)
    .maybeSingle<StorageObjectRow>();

  if (objectError) {
    throw new HttpError(500, "Failed to validate uploaded video", objectError.message);
  }
  if (!objectRow) {
    throw new HttpError(400, "Uploaded video not found in storage");
  }

  const sizeBytes = parseObjectSizeBytes(objectRow.metadata);
  if (!Number.isFinite(sizeBytes)) {
    throw new HttpError(400, "Could not read uploaded video size");
  }
  if (sizeBytes > maxBytes) {
    throw new HttpError(400, `Video is too large. Maximum allowed size is ${Math.floor(maxBytes / (1024 * 1024))}MB`);
  }

  return parsed;
}

export async function removeStorageObjectSafe(
  service: SupabaseClient,
  bucket: string,
  objectPath: string,
): Promise<void> {
  try {
    await service.storage.from(bucket).remove([objectPath]);
  } catch (_error) {
    // Best-effort cleanup. No-op on failure.
  }
}
