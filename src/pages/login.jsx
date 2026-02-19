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

  useEffect(() => {
    if (loading || !user) return;
    const next = typeof router.query.next === "string" ? router.query.next : null;
    router.replace(next || (isAdmin ? "/admin" : "/teacher/dashboard"));
  }, [isAdmin, loading, router, user]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!supabase) {
      setError(configError || "Supabase is not configured.");
      return;
    }
    setBusy(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setBusy(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
  };

  return (
    <AppShell title="Login" subtitle="Access teacher dashboard or admin panel.">
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
              <Link href="/signup" className="tfh-btn tfh-btn-outline">
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
            New here? <Link href="/signup">Create your account</Link>.
          </p>
        </div>
      </div>
    </AppShell>
  );
};

export default LoginPage;
