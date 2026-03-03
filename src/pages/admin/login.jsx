import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Alert, Button, Card, CardBody, Chip } from "@heroui/react";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";
import { sanitizeNextPath, signInWithGoogle } from "@library/auth";

const AdminLoginPage = () => {
  const router = useRouter();
  const { supabase, user, isAdmin, loading, isConfigured, configError } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const nextFromQuery = sanitizeNextPath(
    typeof router.query.next === "string" ? router.query.next : null,
    "/admin",
  );

  const adminNext = useMemo(
    () => (nextFromQuery.startsWith("/admin") ? nextFromQuery : "/admin"),
    [nextFromQuery],
  );

  useEffect(() => {
    if (loading || !user) return;

    if (isAdmin) {
      router.replace(adminNext);
      return;
    }

    setError("This account is not in admin_users yet. Add admin role and sign in again.");
  }, [adminNext, isAdmin, loading, router, user]);

  const onGoogleLogin = async () => {
    setError("");

    if (!supabase) {
      setError(configError || "Supabase is not configured.");
      return;
    }

    setBusy(true);

    try {
      await signInWithGoogle({ supabase, nextPath: adminNext });
    } catch (err) {
      setError(err?.message || "Google login failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <AppShell title="Admin Login" subtitle="Restricted access for owner and admin accounts." publicView>
      <section className="tfh-auth-grid">
        <div className="tfh-auth-visual">
          <img src="/images/teachfromhome/hero1-mobile.jpeg" alt="Admin Login" />
          <div className="tfh-auth-overlay" />
          <div className="tfh-auth-visual-content">
            <Chip color="warning" variant="flat" size="sm">Admin access</Chip>
            <h2>Review queues and approvals</h2>
            <p>Phase 1, Phase 2, training videos, referrals, and system operations.</p>
          </div>
        </div>

        <Card className="tfh-auth-card">
          <CardBody className="gap-4">
            <h3>Admin Google sign-in</h3>
            <p>Only accounts from admin_users can access the admin panel.</p>

            <Button color="primary" size="lg" onPress={onGoogleLogin} isLoading={busy} fullWidth>
              {busy ? "Redirecting..." : "Login with Google"}
            </Button>

            {error && <Alert color="danger" title={error} />}
            {!isConfigured && <Alert color="danger" title={configError || "Supabase is not configured."} />}

            <Button as={Link} href="/login" variant="light" fullWidth>
              Candidate login
            </Button>
          </CardBody>
        </Card>
      </section>
    </AppShell>
  );
};

export default AdminLoginPage;
