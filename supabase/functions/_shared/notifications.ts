import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export async function createNotification(
  serviceClient: SupabaseClient,
  input: {
    user_id: string;
    type?: "info" | "phase1" | "phase2" | "system" | "referral";
    title: string;
    body: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await serviceClient.from("notifications").insert({
    user_id: input.user_id,
    type: input.type ?? "info",
    title: input.title,
    body: input.body,
    payload: input.payload ?? {},
  });

  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }
}
