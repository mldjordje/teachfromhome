import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Alert, Button, Card, CardBody } from "@heroui/react";
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
    <AppShell title="Admin Login" subtitle="Restricted entry for owner/admin accounts." publicView>
      <section className="tfh-minimal-auth">
        <div className="tfh-minimal-left">
          <span className="tfh-minimal-kicker">Admin workspace</span>
          <h2>Operations and queue control</h2>
          <p>
            Access candidate reviews, training management, referrals, and maintenance actions from one dashboard.
          </p>
          <ul className="tfh-minimal-list">
            <li>Phase 1 and Phase 2 review</li>
            <li>Training videos and referral tools</li>
            <li>Role-based secure access</li>
          </ul>
        </div>

        <Card className="tfh-minimal-card tfh-minimal-primary">
          <CardBody className="gap-4">
            <h3>Admin Google sign-in</h3>
            <p>Only accounts listed in admin_users can enter panel.</p>

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
