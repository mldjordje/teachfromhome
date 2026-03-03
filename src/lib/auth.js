export const sanitizeNextPath = (candidate, fallback = "/teacher/dashboard") => {
  if (typeof candidate !== "string") return fallback;
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//")) return fallback;
  return candidate;
};

export const getOAuthRedirectUrl = (nextPath) => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const target = sanitizeNextPath(nextPath);
  const nextQuery = encodeURIComponent(target);
  return `${window.location.origin}/login?next=${nextQuery}`;
};

export const signInWithGoogle = async ({ supabase, nextPath }) => {
  if (!supabase) {
    throw new Error("Supabase client is not available.");
  }

  const redirectTo = getOAuthRedirectUrl(nextPath);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw error;
  }
};

export const getAccessTokenOrThrow = async (supabase) => {
  if (!supabase) {
    throw new Error("Supabase client is not available.");
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const accessToken = data?.session?.access_token;
  if (!accessToken) {
    throw new Error("Unauthorized: missing session. Please sign in again.");
  }

  return accessToken;
};
