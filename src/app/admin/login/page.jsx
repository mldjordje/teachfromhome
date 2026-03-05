"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, CardBody } from "@heroui/react";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";
import { sanitizeNextPath, signInWithGoogle } from "@library/auth";

const AdminLoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAdmin, loading } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const nextFromQuery = useMemo(
    () => sanitizeNextPath(searchParams?.get("next") || null, "/admin"),
    [searchParams],
  );

  const adminNext = useMemo(() => (nextFromQuery.startsWith("/admin") ? nextFromQuery : "/admin"), [nextFromQuery]);

  useEffect(() => {
    if (loading || !user) return;

    if (isAdmin) {
      router.replace(adminNext);
      return;
    }

    setError("Ovaj nalog nije dodat u admin_users. Dodajte rolu i prijavite se ponovo.");
  }, [adminNext, isAdmin, loading, router, user]);

  const onGoogleLogin = async () => {
    setError("");
    setBusy(true);

    try {
      await signInWithGoogle({ nextPath: adminNext });
    } catch (err) {
      setError(err?.message || "Google prijava nije uspela. Pokušajte ponovo.");
      setBusy(false);
    }
  };

  return (
    <AppShell title="Admin prijava" subtitle="Pristup je dozvoljen samo owner/admin nalozima." publicView>
      <section className="tfh-minimal-auth">
        <div className="tfh-minimal-left">
          <span className="tfh-minimal-kicker">Admin radni prostor</span>
          <h2>Operacije i kontrola queue-a</h2>
          <p>Na jednom mestu upravljate prijavama kandidata, trening klipovima, referral tokom i održavanjem sistema.</p>
          <ul className="tfh-minimal-list">
            <li>Review faze 1 i faze 2</li>
            <li>Trening klipovi i referral alati</li>
            <li>Bezbedan pristup po rolama</li>
          </ul>
        </div>

        <Card className="tfh-minimal-card tfh-minimal-primary">
          <CardBody className="gap-4">
            <h3>Admin Google prijava</h3>
            <p>Samo nalozi upisani u admin_users tabelu mogu ući u panel.</p>

            <Button size="lg" onPress={onGoogleLogin} isLoading={busy} className="tfh-action-btn" fullWidth>
              {busy ? "Preusmeravanje..." : "Prijava preko Google-a"}
            </Button>

            {error && <Alert color="danger" title={error} />}

            <Button as={Link} href="/login" variant="flat" className="tfh-action-btn tfh-action-btn--ghost" fullWidth>
              Kandidatska prijava
            </Button>
          </CardBody>
        </Card>
      </section>
    </AppShell>
  );
};

export default AdminLoginPage;
