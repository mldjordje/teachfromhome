"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, CardBody } from "@heroui/react";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";
import { sanitizeNextPath, signInWithGoogle } from "@library/auth";

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAdmin, loading } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const nextFromQuery = useMemo(
    () => sanitizeNextPath(searchParams?.get("next") || null, "/teacher/dashboard"),
    [searchParams],
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
    setBusy(true);

    try {
      await signInWithGoogle({ nextPath: nextFromQuery });
    } catch (err) {
      setError(err?.message || "Google prijava nije uspela. Pokusajte ponovo.");
      setBusy(false);
    }
  };

  return (
    <AppShell title="Prijava" subtitle="Pristup kandidatskom ili admin nalogu preko Google-a." publicView>
      <section className="tfh-minimal-auth">
        <Card className="tfh-minimal-left">
          <CardBody className="gap-4">
            <span className="tfh-minimal-kicker">Bezbedan pristup</span>
            <h2>Jedna prijava, brz ulazak</h2>
            <p>Sistem automatski prepoznaje ulogu i vodi te na odgovarajuci panel.</p>
            <ul className="tfh-minimal-list">
              <li>Samo Google OAuth</li>
              <li>Bez resetovanja lozinke</li>
              <li>Optimizovano za telefon i desktop</li>
            </ul>
          </CardBody>
        </Card>

        <Card className="tfh-minimal-card tfh-minimal-primary">
          <CardBody className="gap-4">
            <h3>Nastavi preko Google-a</h3>
            <p>Koristi postojeci Google nalog za nastavak procesa.</p>

            <Button className="tfh-action-btn" size="lg" onPress={onGoogleLogin} isLoading={busy} fullWidth>
              {busy ? "Preusmeravanje..." : "Prijavi se Google nalogom"}
            </Button>

            {error && <Alert color="danger" title={error} />}

            <Button
              as={Link}
              href={`/signup?next=${encodeURIComponent(nextFromQuery)}`}
              className="tfh-action-btn tfh-action-btn--ghost"
              variant="flat"
              fullWidth
            >
              Nemas nalog?
            </Button>
          </CardBody>
        </Card>
      </section>
    </AppShell>
  );
};

export default LoginPage;