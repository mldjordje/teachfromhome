import { signIn } from "next-auth/react";

export const sanitizeNextPath = (candidate, fallback = "/teacher/dashboard") => {
  if (typeof candidate !== "string") return fallback;
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//")) return fallback;
  return candidate;
};

export const signInWithGoogle = async ({ nextPath }) => {
  const callbackUrl = sanitizeNextPath(nextPath, "/teacher/dashboard");
  await signIn("google", { callbackUrl });
};

export const getAccessTokenOrThrow = async () => {
  return "server-session";
};
