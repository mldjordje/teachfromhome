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

    const [{ data: profileData, error: profileError }, { data: adminData, error: adminError }] = await Promise.all([
      client.from("profiles").select("*").eq("user_id", nextUser.id).maybeSingle(),
      client.rpc("is_admin", { _user_id: nextUser.id }),
    ]);

    if (profileError) {
      console.error("Failed to load profile", profileError);
    }
    if (adminError) {
      console.error("Failed to check admin role", adminError);
    }

    setProfile(profileData ?? null);
    setIsAdmin(adminData === true);
  };

  const refreshAuthState = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const nextSession = data.session ?? null;
      const nextUser = nextSession?.user ?? null;

      setSession(nextSession);
      setUser(nextUser);
      await hydrateUserData(supabase, nextUser);
    } catch (error) {
      console.error("refreshAuthState failed", error);
      setConfigError(error?.message || "Auth refresh failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let mounted = true;
    let subscription = null;

    const boot = async () => {
      try {
        const client = getSupabaseBrowserClient();
        if (!mounted) return;
        setSupabase(client);

        const { data } = await client.auth.getSession();
        const nextSession = data.session ?? null;
        const nextUser = nextSession?.user ?? null;

        setSession(nextSession);
        setUser(nextUser);
        await hydrateUserData(client, nextUser);

        const { data: authSubscription } = client.auth.onAuthStateChange(async (_event, changedSession) => {
          try {
            const changedUser = changedSession?.user ?? null;
            setSession(changedSession ?? null);
            setUser(changedUser);
            await hydrateUserData(client, changedUser);
          } catch (error) {
            console.error("onAuthStateChange failed", error);
            setConfigError(error?.message || "Auth state update failed.");
          } finally {
            setLoading(false);
          }
        });
        subscription = authSubscription.subscription;
      } catch (error) {
        if (!mounted) return;
        console.error("Auth boot failed", error);
        setConfigError(error?.message || "Supabase is not configured.");
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
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
