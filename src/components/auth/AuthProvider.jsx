import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@library/supabaseClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [supabase, setSupabase] = useState(null);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState("");

  const hydrateUserData = async (client, nextUser) => {
    if (!nextUser) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }

    const [{ data: profileData }, { data: adminData }] = await Promise.all([
      client.from("profiles").select("*").eq("user_id", nextUser.id).maybeSingle(),
      client.rpc("is_admin", { _user_id: nextUser.id }),
    ]);

    setProfile(profileData ?? null);
    setIsAdmin(adminData === true);
  };

  const refreshAuthState = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    const nextSession = data.session ?? null;
    const nextUser = nextSession?.user ?? null;

    setSession(nextSession);
    setUser(nextUser);
    await hydrateUserData(supabase, nextUser);
    setLoading(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let mounted = true;
    let subscription = null;

    const boot = async () => {
      let client;
      try {
        client = getSupabaseBrowserClient();
      } catch (error) {
        if (!mounted) return;
        setConfigError(error?.message || "Supabase is not configured.");
        setLoading(false);
        return;
      }

      if (!mounted) return;
      setSupabase(client);

      const { data } = await client.auth.getSession();
      const nextSession = data.session ?? null;
      const nextUser = nextSession?.user ?? null;

      setSession(nextSession);
      setUser(nextUser);
      await hydrateUserData(client, nextUser);
      if (mounted) {
        setLoading(false);
      }

      const { data: authSubscription } = client.auth.onAuthStateChange(async (_event, changedSession) => {
        const changedUser = changedSession?.user ?? null;
        setSession(changedSession ?? null);
        setUser(changedUser);
        await hydrateUserData(client, changedUser);
        setLoading(false);
      });
      subscription = authSubscription.subscription;
    };

    boot();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        supabase,
        session,
        user,
        profile,
        isAdmin,
        loading,
        isConfigured: Boolean(supabase),
        configError,
        refreshAuthState,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
};
