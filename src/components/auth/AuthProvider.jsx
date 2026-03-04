"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { signOut as nextAuthSignOut, useSession } from "next-auth/react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [configError, setConfigError] = useState("");
  const [hydrating, setHydrating] = useState(false);

  const user = session?.user || null;

  const hydrate = async () => {
    if (!user) {
      setProfile(null);
      setIsAdmin(false);
      setConfigError("");
      return;
    }

    setHydrating(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to load auth state");
      }

      setProfile(payload.profile || null);
      setIsAdmin(payload.is_admin === true);
      setConfigError("");
    } catch (error) {
      setConfigError(error?.message || "Failed to hydrate auth state");
      setProfile(null);
      setIsAdmin(false);
    } finally {
      setHydrating(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      hydrate();
      return;
    }

    if (status === "unauthenticated") {
      setProfile(null);
      setIsAdmin(false);
      setHydrating(false);
    }
  }, [status, session?.user?.id]);

  const signOut = async () => {
    await nextAuthSignOut({ callbackUrl: "/login" });
  };

  const value = useMemo(
    () => ({
      session,
      user,
      profile,
      isAdmin,
      loading: status === "loading" || (status === "authenticated" && hydrating),
      isConfigured: true,
      configError,
      refreshAuthState: hydrate,
      signOut,
    }),
    [session, user, profile, isAdmin, status, hydrating, configError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
};
