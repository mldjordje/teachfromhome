import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Alert, Button, Card, CardBody, CardHeader, Divider } from "@heroui/react";
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

    setError("This account is not in admin_users yet. Add admin privileges and sign in again.");
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
    <AppShell title="Admin Login" subtitle="Pristup admin panelu preko Google auth naloga sa owner/admin rolom.">
      <div className="tfh-grid tfh-grid-2">
        <Card className="shadow-sm">
          <CardHeader className="flex-col items-start gap-1">
            <h3 className="text-2xl font-semibold text-slate-800">Admin Google sign-in</h3>
            <p className="text-sm text-slate-500">Samo nalozi iz `admin_users` mogu da uđu u admin panel.</p>
          </CardHeader>
          <Divider />
          <CardBody className="gap-4">
            <Button color="primary" size="lg" onPress={onGoogleLogin} isLoading={busy} fullWidth>
              {busy ? "Redirecting..." : "Login with Google"}
            </Button>

            {error && <Alert color="danger" title={error} />}
            {!isConfigured && (
              <Alert color="danger" title={configError || "Supabase is not configured."} />
            )}

            <Button as={Link} href="/login" variant="light" fullWidth>
              Candidate login
            </Button>
          </CardBody>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex-col items-start gap-1">
            <h3 className="text-2xl font-semibold text-slate-800">Admin access checklist</h3>
            <p className="text-sm text-slate-500">Ako vidiš unauthorized, najčešći uzrok je da nalog nema admin rolu.</p>
          </CardHeader>
          <Divider />
          <CardBody className="text-sm leading-6 text-slate-600">
            <p>1. Nalog mora postojati u Supabase Auth.</p>
            <p>2. Isti email mora biti upisan u `admin_users` kao `owner` ili `admin`.</p>
            <p>3. Posle promene role: logout/login da se osveži session.</p>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
};

export default AdminLoginPage;
