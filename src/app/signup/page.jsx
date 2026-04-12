"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, CardBody, Input } from "@heroui/react";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";
import { trackEvent, trackVisitOnce } from "@library/analytics";
import { sanitizeNextPath, signInWithGoogle } from "@library/auth";
import { apiPost } from "@library/apiClient";
import { buildTeacherApplicationFlow, resolveTeacherPostLoginPath } from "@config/teacherFlow";

const REFERRAL_STORAGE_KEY = "tfh_pending_referral_code";
const signupBenefits = [
  "Referral kod je opcion",
  "Google nalog je dovoljan za nastavak",
  "Posle registracije odmah ides na svoj sledeci korak",
];

const SignupPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAdmin, loading } = useAuth();
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const nextTarget = useMemo(
    () => sanitizeNextPath(searchParams?.get("next") || null, "/teacher/dashboard"),
    [searchParams],
  );

  useEffect(() => {
    if (loading || !user || typeof window === "undefined") return;

    const resolveTeacherTarget = async () => {
      try {
        const response = await fetch("/api/teacher/dashboard", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!response.ok) return nextTarget;

        const payload = await response.json();
        const flow = buildTeacherApplicationFlow({
          phase1Attempts: payload?.phase1Attempts || [],
          phase2Task: payload?.phase2Task || null,
        });

        return resolveTeacherPostLoginPath({
          requestedPath: nextTarget,
          flow,
        });
      } catch (_error) {
        return nextTarget;
      }
    };

    const finalizeSignup = async () => {
      const pendingCode = window.localStorage.getItem(REFERRAL_STORAGE_KEY)?.trim();
      if (!pendingCode) {
        const teacherTarget = await resolveTeacherTarget();
        router.replace(isAdmin ? "/admin" : teacherTarget);
        return;
      }

      try {
        await apiPost("/api/referrals/apply", {
          referral_code: pendingCode,
        });

        window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
        setSuccess("Referral kod je uspesno povezan.");
      } catch (refError) {
        setError(refError?.message || "Referral kod nije moguce primeniti.");
      } finally {
        const teacherTarget = await resolveTeacherTarget();
        router.replace(isAdmin ? "/admin" : teacherTarget);
      }
    };

    finalizeSignup();
  }, [isAdmin, loading, nextTarget, router, user]);

  useEffect(() => {
    trackVisitOnce({ page: "signup" });
  }, []);

  const onGoogleSignup = async () => {
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      await trackEvent({ eventName: "started_signup", metadata: { channel: "google_oauth" } });

      if (typeof window !== "undefined") {
        const trimmed = referralCode.trim();
        if (trimmed) {
          window.localStorage.setItem(REFERRAL_STORAGE_KEY, trimmed);
        } else {
          window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
        }
      }

      await signInWithGoogle({ nextPath: `/signup?next=${encodeURIComponent(nextTarget)}` });
    } catch (err) {
      setError(err?.message || "Registracija nije uspela. Pokusajte ponovo.");
      setBusy(false);
    }
  };

  return (
    <AppShell title="Registracija" subtitle="Kreiraj kandidatski nalog za manje od jednog minuta." publicView>
      <section className="tfh-minimal-auth">
        <Card className="tfh-minimal-left">
          <CardBody className="gap-4">
            <span className="tfh-minimal-kicker">Novi kandidat</span>
            <h2>Brza registracija</h2>
            <p>Unesi referral kod ako ga imas i nastavi preko Google naloga.</p>
            <div className="tfh-entry-metrics">
              <article className="tfh-entry-metric">
                <span>Referral</span>
                <strong>Opciono</strong>
              </article>
              <article className="tfh-entry-metric">
                <span>Nalog</span>
                <strong>Google</strong>
              </article>
              <article className="tfh-entry-metric">
                <span>Nastavak</span>
                <strong>Odmah na Fazu 1</strong>
              </article>
            </div>
            <ul className="tfh-minimal-list">
              {signupBenefits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="tfh-entry-note">
              Ako nemas referral, samo ostavi polje prazno i nastavi dalje.
            </div>
          </CardBody>
        </Card>

        <Card className="tfh-minimal-card tfh-minimal-primary">
          <CardBody className="gap-4">
            <h3>Napravi nalog</h3>

            <Input
              label="Referral kod (opciono)"
              placeholder="ABC123DEF4"
              value={referralCode}
              onValueChange={setReferralCode}
              variant="bordered"
            />

            <Button size="lg" onPress={onGoogleSignup} isLoading={busy} className="tfh-action-btn" fullWidth>
              {busy ? "Preusmeravanje..." : "Nastavi sa Google"}
            </Button>

            {error && <Alert color="danger" title={error} />}
            {success && <Alert color="success" title={success} />}

            <Button
              as={Link}
              href={`/login?next=${encodeURIComponent(nextTarget)}`}
              variant="flat"
              className="tfh-action-btn tfh-action-btn--ghost"
              fullWidth
            >
              Vec imam nalog
            </Button>
          </CardBody>
        </Card>
      </section>
    </AppShell>
  );
};

export default SignupPage;
