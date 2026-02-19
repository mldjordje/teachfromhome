import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { HttpError } from "./http.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY environment variables",
  );
}

export function getServiceClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getUserClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get("Authorization") ?? "";

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

export async function requireUser(req: Request): Promise<{
  user: { id: string; email?: string };
  userClient: SupabaseClient;
}> {
  const userClient = getUserClient(req);
  const { data, error } = await userClient.auth.getUser();

  if (error || !data.user) {
    throw new HttpError(401, "Unauthorized");
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? undefined,
    },
    userClient,
  };
}

export async function assertAdmin(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data, error } = await serviceClient.rpc("is_admin", { _user_id: userId });
  if (error) {
    throw new HttpError(500, "Failed to verify admin role", error.message);
  }

  if (data !== true) {
    throw new HttpError(403, "Admin privileges required");
  }
}
