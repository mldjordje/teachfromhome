import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Alert, Button, Card, CardBody, Chip } from "@heroui/react";
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
    <AppShell title="Login" subtitle="Secure sign in for candidates and admins." publicView>
      <section className="tfh-auth-grid">
        <div className="tfh-auth-visual">
          <img src="/images/teachfromhome/hero1-mobile.jpeg" alt="TeachFromHome Login" />
          <div className="tfh-auth-overlay" />
          <div className="tfh-auth-visual-content">
            <Chip color="primary" variant="flat" size="sm">Google Auth</Chip>
            <h2>One-click login</h2>
            <p>Use your Google account to continue onboarding and upload tasks.</p>
          </div>
        </div>

        <Card className="tfh-auth-card">
          <CardBody className="gap-4">
            <h3>Continue with Google</h3>
            <p>System automatically routes you to candidate or admin workspace.</p>

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
