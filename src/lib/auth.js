import { signIn } from "next-auth/react";

export const sanitizeNextPath = (candidate, fallback = "/teacher/dashboard") => {
  if (typeof candidate !== "string") return fallback;
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//")) return fallback;
  return candidate;
};

export const signInWithGoogle = async ({ nextPath }) => {
  const callbackUrl = sanitizeNextPath(nextPath, "/teacher/dashboard");
  const result = await signIn("google", {
    callbackUrl,
    redirect: false,
  });

  if (!result) {
    throw new Error("Google prijava nije uspela. Pokušaj ponovo.");
  }

  if (result.error) {
    throw new Error(result.error);
  }

  if (result.url && typeof window !== "undefined") {
    window.location.assign(result.url);
    return;
  }

  throw new Error("Google prijava nije uspela. Pokušaj ponovo.");
};

export const getAccessTokenOrThrow = async () => {
  return "server-session";
};
