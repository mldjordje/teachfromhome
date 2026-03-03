import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Alert, Button, Card, CardBody } from "@heroui/react";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";
import { sanitizeNextPath, signInWithGoogle } from "@library/auth";

const LoginPage = () => {
  const router = useRouter();
  const { supabase, user, isAdmin, loading, isConfigured, configError } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const nextFromQuery = sanitizeNextPath(
    typeof router.query.next === "string" ? router.query.next : null,
    "/teacher/dashboard",
  );

  useEffect(() => {
    if (loading || !user) return;

    if (isAdmin) {
      const adminTarget = nextFromQuery.startsWith("/admin") ? nextFromQuery : "/admin";
      router.replace(adminTarget);
      return;
    }

    router.replace(nextFromQuery);
  }, [isAdmin, loading, nextFromQuery, router, user]);

  const onGoogleLogin = async () => {
    setError("");
    if (!supabase) {
      setError(configError || "Supabase is not configured.");
      return;
    }

    setBusy(true);
    try {
      await signInWithGoogle({ supabase, nextPath: nextFromQuery });
    } catch (err) {
      setError(err?.message || "Google login failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <AppShell title="Login" subtitle="Access candidate or admin workspace with Google." publicView>
      <section className="tfh-minimal-auth">
        <div className="tfh-minimal-left">
          <span className="tfh-minimal-kicker">Secure access</span>
          <h2>Single sign-on, zero friction</h2>
          <p>
            Sign in once with Google. System auto-detects role and routes you to candidate dashboard or admin panel.
          </p>
          <ul className="tfh-minimal-list">
            <li>Google OAuth only</li>
            <li>No manual password resets</li>
            <li>Optimized for phone and desktop</li>
          </ul>
        </div>

        <Card className="tfh-minimal-card tfh-minimal-primary">
          <CardBody className="gap-4">
            <h3>Continue with Google</h3>
            <p>Use your existing Google account to continue onboarding.</p>

            <Button color="primary" size="lg" onPress={onGoogleLogin} isLoading={busy} fullWidth>
              {busy ? "Redirecting..." : "Sign in with Google"}
            </Button>

            {error && <Alert color="danger" title={error} />}
            {!isConfigured && <Alert color="danger" title={configError || "Supabase is not configured."} />}

            <Button as={Link} href={`/signup?next=${encodeURIComponent(nextFromQuery)}`} variant="light" fullWidth>
              Need a new account?
            </Button>
          </CardBody>
        </Card>
      </section>
    </AppShell>
  );
};

export default LoginPage;
