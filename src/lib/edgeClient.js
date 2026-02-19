export const callEdgeFunction = async ({ functionName, accessToken, body }) => {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!baseUrl || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const headers = {
    "Content-Type": "application/json",
    apikey: anonKey,
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });

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
