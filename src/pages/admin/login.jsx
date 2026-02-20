import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";

const AdminLoginPage = () => {
  const router = useRouter();
  const { supabase, user, isAdmin, loading, isConfigured, configError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const nextFromQuery =
    typeof router.query.next === "string" && router.query.next.startsWith("/admin") ? router.query.next : null;
  const adminNext = useMemo(() => nextFromQuery || "/admin", [nextFromQuery]);

  useEffect(() => {
    if (loading || !user) return;

    if (isAdmin) {
      router.replace(adminNext);
      return;
    }

    router.replace("/teacher/dashboard");
  }, [adminNext, isAdmin, loading, router, user]);

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
    }
  };

  return (
    <AppShell title="Admin Login" subtitle="Owner/admin access to review queues and workflows.">
      <div className="tfh-grid tfh-grid-2">
        <div className="tfh-card">
          <h3>Admin sign in</h3>
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
                {busy ? "Signing in..." : "Login as admin"}
              </button>
              <Link href="/login" className="tfh-btn tfh-btn-outline">
                Teacher login
              </Link>
            </div>
          </form>
        </div>

        <div className="tfh-card">
          <h3>Admin workspace</h3>
          <p>From here you can review Phase 1 and Phase 2 queues, manage training videos, and control referrals.</p>
          <p>Only accounts registered in the `admin_users` table can access the admin panel.</p>
        </div>
      </div>
    </AppShell>
  );
};

export default AdminLoginPage;
