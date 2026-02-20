import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";

const LoginPage = () => {
  const router = useRouter();
  const { supabase, user, isAdmin, loading, isConfigured, configError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const nextFromQuery =
    typeof router.query.next === "string" && router.query.next.startsWith("/") ? router.query.next : null;
  const nextTarget = nextFromQuery || "/teacher/dashboard";

  useEffect(() => {
    if (loading || !user) return;

    if (isAdmin) {
      const adminTarget = nextFromQuery?.startsWith("/admin") ? nextFromQuery : "/admin";
      router.replace(adminTarget);
      return;
    }

    router.replace(nextFromQuery || "/teacher/dashboard");
  }, [isAdmin, loading, nextFromQuery, router, user]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!supabase) {
      setError(configError || "Supabase is not configured.");
      return;
    }
    setBusy(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      }
    } catch (err) {
      const msg = err?.message || "Login failed. Please try again.";
      setError(msg.includes("LockManager") ? "Session lock timeout. Close duplicate tabs and try again." : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Login" subtitle="Access your teacher onboarding account.">
      <div className="tfh-grid tfh-grid-2">
        <div className="tfh-card">
          <h3>Sign in</h3>
          <form className="tfh-form" onSubmit={onSubmit}>
            <div>
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            {error && <div className="tfh-alert tfh-error">{error}</div>}
            {!isConfigured && <div className="tfh-alert tfh-error">{configError || "Supabase is not configured."}</div>}

            <div className="tfh-actions">
              <button className="tfh-btn" type="submit" disabled={busy}>
                {busy ? "Signing in..." : "Login"}
              </button>
              <Link href={`/signup?next=${encodeURIComponent(nextTarget)}`} className="tfh-btn tfh-btn-outline">
                Create account
              </Link>
            </div>
          </form>
        </div>

        <div className="tfh-card">
          <h3>TeachFromHome access</h3>
          <p>
            Use this login to continue your onboarding process:
            <br />
            Phase 1 submission, Phase 2 training, notifications and profile management.
          </p>
          <p>
            New here? <Link href={`/signup?next=${encodeURIComponent(nextTarget)}`}>Create your account</Link>.
          </p>
        </div>
      </div>
    </AppShell>
  );
};

export default LoginPage;

