import { json, handleError, HttpError, preflight, methodNotAllowed } from "../_shared/http.ts";
import { assertAdmin, getServiceClient, requireUser } from "../_shared/supabase.ts";
import { parseStoragePath } from "../_shared/storage.ts";

const PHASE1_REJECTED_RETENTION_DAYS = Number(Deno.env.get("PHASE1_REJECTED_RETENTION_DAYS") ?? "14");
const PHASE2_CLOSED_RETENTION_DAYS = Number(Deno.env.get("PHASE2_CLOSED_RETENTION_DAYS") ?? "30");
const ORPHAN_RETENTION_HOURS = Number(Deno.env.get("ORPHAN_RETENTION_HOURS") ?? "24");
const CLEANUP_BATCH_SIZE = Number(Deno.env.get("CLEANUP_BATCH_SIZE") ?? "300");

function toIsoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function toIsoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function removePaths(
  service: ReturnType<typeof getServiceClient>,
  fullPaths: string[],
): Promise<{ deleted: number; failed: number }> {
  const grouped = new Map<string, string[]>();

  for (const fullPath of fullPaths) {
    try {
      const parsed = parseStoragePath(fullPath);
      const current = grouped.get(parsed.bucket) ?? [];
      current.push(parsed.objectPath);
      grouped.set(parsed.bucket, current);
    } catch (_error) {
      // Ignore malformed paths during cleanup.
    }
  }

  let deleted = 0;
  let failed = 0;

  for (const [bucket, objects] of grouped.entries()) {
    const uniqueObjects = Array.from(new Set(objects));
    for (const batch of chunk(uniqueObjects, 100)) {
      const { error } = await service.storage.from(bucket).remove(batch);
      if (error) {
        failed += batch.length;
      } else {
        deleted += batch.length;
      }
    }
  }

  return { deleted, failed };
}

Deno.serve(async (req) => {
  try {
    const pre = preflight(req);
    if (pre) return pre;

    if (req.method !== "POST") {
      throw methodNotAllowed();
    }

    const { user } = await requireUser(req);
    const service = getServiceClient();
    await assertAdmin(service, user.id);

    const phase1CutoffIso = toIsoDaysAgo(PHASE1_REJECTED_RETENTION_DAYS);
    const phase2CutoffIso = toIsoDaysAgo(PHASE2_CLOSED_RETENTION_DAYS);
    const orphanCutoffIso = toIsoHoursAgo(ORPHAN_RETENTION_HOURS);

    const { data: stalePhase1Rows, error: stalePhase1Error } = await service
      .from("teacher_phase1_submissions")
      .select("video_path")
      .eq("status", "rejected")
      .eq("is_deleted", false)
      .lt("reviewed_at", phase1CutoffIso)
      .limit(CLEANUP_BATCH_SIZE);

    if (stalePhase1Error) {
      throw new HttpError(500, "Failed to load stale Phase 1 videos", stalePhase1Error.message);
    }

    const { data: closedTasks, error: tasksError } = await service
      .from("teacher_phase2_tasks")
      .select("id")
      .in("status", ["accepted", "rejected"])
      .lt("closed_at", phase2CutoffIso)
      .limit(CLEANUP_BATCH_SIZE);

    if (tasksError) {
      throw new HttpError(500, "Failed to load closed Phase 2 tasks", tasksError.message);
    }

    const closedTaskIds = (closedTasks ?? []).map((row) => row.id);
    let stalePhase2Rows: { video_path: string }[] = [];
    if (closedTaskIds.length > 0) {
      const { data: phase2Rows, error: stalePhase2Error } = await service
        .from("teacher_phase2_submissions")
        .select("video_path")
        .in("task_id", closedTaskIds)
        .eq("is_deleted", false)
        .limit(CLEANUP_BATCH_SIZE);
      if (stalePhase2Error) {
        throw new HttpError(500, "Failed to load stale Phase 2 videos", stalePhase2Error.message);
      }
      stalePhase2Rows = phase2Rows ?? [];
    }

    const stalePaths = [
      ...(stalePhase1Rows ?? []).map((row) => row.video_path),
      ...stalePhase2Rows.map((row) => row.video_path),
    ].filter(Boolean);

    const staleResult = await removePaths(service, stalePaths);

    const [{ data: phase1Refs, error: phase1RefsError }, { data: phase2Refs, error: phase2RefsError }] =
      await Promise.all([
        service
          .from("teacher_phase1_submissions")
          .select("video_path")
          .eq("is_deleted", false)
          .limit(5000),
        service
          .from("teacher_phase2_submissions")
          .select("video_path")
          .eq("is_deleted", false)
          .limit(5000),
      ]);

    if (phase1RefsError || phase2RefsError) {
      throw new HttpError(
        500,
        "Failed to load referenced video paths",
        phase1RefsError?.message ?? phase2RefsError?.message,
      );
    }

    const referencedPaths = new Set<string>(
      [...(phase1Refs ?? []), ...(phase2Refs ?? [])]
        .map((row) => row.video_path)
        .filter(Boolean),
    );

    const orphanCandidates: string[] = [];
    for (const bucket of ["phase1-videos", "phase2-videos"]) {
      const { data: objects, error: objectsError } = await service.rpc("list_old_storage_objects", {
        _bucket: bucket,
        _before: orphanCutoffIso,
        _limit: CLEANUP_BATCH_SIZE,
      });

      if (objectsError) {
        throw new HttpError(500, "Failed to load storage objects for orphan cleanup", objectsError.message);
      }

      for (const row of objects ?? []) {
        const fullPath = `${row.bucket_id}/${row.name}`;
        if (!referencedPaths.has(fullPath)) {
          orphanCandidates.push(fullPath);
        }
      }
    }

    const orphanResult = await removePaths(service, orphanCandidates);

    return json({
      ok: true,
      deleted: {
        stale: staleResult.deleted,
        orphan: orphanResult.deleted,
      },
      failed: {
        stale: staleResult.failed,
        orphan: orphanResult.failed,
      },
      scanned: {
        stale_candidates: stalePaths.length,
        orphan_candidates: orphanCandidates.length,
      },
      cutoffs: {
        phase1_rejected_before: phase1CutoffIso,
        phase2_closed_before: phase2CutoffIso,
        orphan_before: orphanCutoffIso,
      },
    });
  } catch (error) {
    return handleError(error);
  }
});
