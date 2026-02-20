export const callEdgeFunction = async ({ functionName, accessToken, body }) => {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!baseUrl || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and publishable key (NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)",
    );
  }

  const headers = {
    "Content-Type": "application/json",
    apikey: anonKey,
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let res;
  try {
    res = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Function ${functionName} timed out. Please try again.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch (_) {
    payload = null;
  }

  if (!res.ok) {
    const message = payload?.error || `Function ${functionName} failed`;
    throw new Error(message);
  }

  return payload;
};
