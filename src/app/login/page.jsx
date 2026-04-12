"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, CardBody } from "@heroui/react";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";
import { sanitizeNextPath, signInWithGoogle } from "@library/auth";
import { trackVisitOnce } from "@library/analytics";
import { buildTeacherApplicationFlow, resolveTeacherPostLoginPath } from "@config/teacherFlow";

const quickStates = [
  "Novi kandidat ide direktno na Fazu 1",
  "Ako si vec slao prijavu, otvara ti se pravi sledeci korak",
  "Sve ostaje vezano za isti Google nalog",
];

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
  const autoStart = useMemo(() => searchParams?.get("auto") === "1", [searchParams]);

  useEffect(() => {
    if (loading || !user) return;

    let active = true;

    const routeUser = async () => {
      if (isAdmin) {
        const adminTarget = nextFromQuery.startsWith("/admin") ? nextFromQuery : "/admin";
        router.replace(adminTarget);
        return;
      }

      try {
        const response = await fetch("/api/teacher/dashboard", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!response.ok) {
          router.replace(nextFromQuery);
          return;
        }

        const payload = await response.json();
        if (!active) return;

        const flow = buildTeacherApplicationFlow({
          phase1Attempts: payload?.phase1Attempts || [],
          phase2Task: payload?.phase2Task || null,
        });
        const nextPath = resolveTeacherPostLoginPath({
          requestedPath: nextFromQuery,
          flow,
        });

        router.replace(nextPath);
      } catch (_error) {
        if (!active) return;
        router.replace(nextFromQuery);
      }
    };

    routeUser();

    return () => {
      active = false;
    };
  }, [isAdmin, loading, nextFromQuery, router, user]);

  useEffect(() => {
    trackVisitOnce({ page: "login" });
  }, []);

  const onGoogleLogin = useCallback(async () => {
    setError("");
    setBusy(true);

    try {
      await signInWithGoogle({ nextPath: nextFromQuery });
    } catch (err) {
      setError(err?.message || "Google prijava nije uspela. Pokusajte ponovo.");
      setBusy(false);
    }
  }, [nextFromQuery]);

  useEffect(() => {
    if (!autoStart || loading || user || busy) return;
    onGoogleLogin();
  }, [autoStart, busy, loading, onGoogleLogin, user]);

  return (
    <AppShell title="Prijava" subtitle="Google prijava i automatski nastavak na tvoj status." publicView>
      <section className="tfh-minimal-auth">
        <Card className="tfh-minimal-left">
          <CardBody className="gap-4">
            <span className="tfh-minimal-kicker">Brz ulazak</span>
            <h2>Jedna prijava</h2>
            <p>Nakon logina odmah vidis status prijave i sledeci korak.</p>
            <div className="tfh-entry-metrics">
              <article className="tfh-entry-metric">
                <span>Ulaz</span>
                <strong>Google</strong>
              </article>
              <article className="tfh-entry-metric">
                <span>Lozinka</span>
                <strong>Nije potrebna</strong>
              </article>
              <article className="tfh-entry-metric">
                <span>Uredjaj</span>
                <strong>Telefon + desktop</strong>
              </article>
            </div>
            <ul className="tfh-minimal-list">
              {quickStates.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card className="tfh-minimal-card tfh-minimal-primary">
          <CardBody className="tfh-auth-cta-body">
            <div className="tfh-auth-cta-copy">
              <span className="tfh-minimal-kicker">Nastavi</span>
              <h3>Google prijava</h3>
              <p>Koristi svoj Google nalog i nastavi tamo gde si stao.</p>
            </div>

            <Button className="tfh-action-btn tfh-auth-cta-primary" size="lg" onPress={onGoogleLogin} isLoading={busy} fullWidth>
              {busy ? "Preusmeravanje..." : "Prijavi se"}
            </Button>

            {error && <Alert color="danger" title={error} className="tfh-auth-cta-alert" />}

            <Link href={`/signup?next=${encodeURIComponent(nextFromQuery)}`} className="tfh-auth-cta-link">
              Prvi put? Registracija
            </Link>
          </CardBody>
        </Card>
      </section>
    </AppShell>
  );
};

export default LoginPage;
