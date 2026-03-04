export const dynamic = "force-dynamic";

import { toErrorResponse } from "@/src/server/http/errors";
import { listAllRewards } from "@/src/server/services/referralService";
import { requireAdmin } from "@/src/server/auth/session";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await listAllRewards();
    return Response.json({
      rows: rows.map((row) => ({
        id: row.id,
        referrer_id: row.referrerId,
        referred_id: row.referredId,
        amount_eur: row.amountEur,
        status: row.status,
        eligible_at: row.eligibleAt,
        approved_at: row.approvedAt,
        paid_at: row.paidAt,
        notes: row.notes,
        created_at: row.createdAt,
        updated_at: row.updatedAt,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}


