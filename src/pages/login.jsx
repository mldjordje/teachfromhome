import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Alert, Button, Card, CardBody, CardHeader, Divider } from "@heroui/react";
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
    <AppShell title="Login" subtitle="Prijava za kandidate i admin tim preko Google naloga.">
      <div className="tfh-grid tfh-grid-2">
        <Card className="shadow-sm">
          <CardHeader className="flex-col items-start gap-1">
            <h3 className="text-2xl font-semibold text-slate-800">Continue with Google</h3>
            <p className="text-sm text-slate-500">Koristi isti Google nalog za kandidat i admin pristup.</p>
          </CardHeader>
          <Divider />
          <CardBody className="gap-4">
            <Button color="primary" size="lg" onPress={onGoogleLogin} isLoading={busy} fullWidth>
              {busy ? "Redirecting..." : "Sign in with Google"}
            </Button>

            {!isConfigured && (
              <Alert color="danger" title={configError || "Supabase is not configured."} />
            )}
            {error && <Alert color="danger" title={error} />}

            <Button as={Link} href={`/signup?next=${encodeURIComponent(nextFromQuery)}`} variant="light" fullWidth>
              Need a new account?
            </Button>
          </CardBody>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex-col items-start gap-1">
            <h3 className="text-2xl font-semibold text-slate-800">After login</h3>
            <p className="text-sm text-slate-500">Sistem automatski prepoznaje da li je nalog admin ili kandidat.</p>
          </CardHeader>
          <Divider />
          <CardBody className="text-sm leading-6 text-slate-600">
            <p>Candidate: dashboard, Phase 1, Phase 2, notifications i profile.</p>
            <p>Admin: queue review, training videos, referrals i operativne akcije.</p>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
};

export default LoginPage;
