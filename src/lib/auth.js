export const sanitizeNextPath = (candidate, fallback = "/teacher/dashboard") => {
  if (typeof candidate !== "string") return fallback;
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//")) return fallback;
  return candidate;
};

const normalizeOrigin = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
};

const isLocalOrigin = (origin) => {
  if (typeof origin !== "string") return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(origin);
};

const getPreferredOAuthOrigin = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const browserOrigin = normalizeOrigin(window.location.origin);
  const configuredOrigin = normalizeOrigin(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_VERCEL_URL,
  );

  if (!browserOrigin) {
    return configuredOrigin;
  }

  // If app is opened from localhost but production URL is configured, use production.
  if (isLocalOrigin(browserOrigin) && configuredOrigin) {
    return configuredOrigin;
  }

  return browserOrigin;
};

export const getOAuthRedirectUrl = (nextPath) => {
  const origin = getPreferredOAuthOrigin();
  if (!origin) return undefined;

  const target = sanitizeNextPath(nextPath);
  const nextQuery = encodeURIComponent(target);
  return `${origin}/login?next=${nextQuery}`;
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
