"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, CardBody, Input } from "@heroui/react";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";
import { trackEvent } from "@library/analytics";
import { sanitizeNextPath, signInWithGoogle } from "@library/auth";
import { apiPost } from "@library/apiClient";

const REFERRAL_STORAGE_KEY = "tfh_pending_referral_code";

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

    const finalizeSignup = async () => {
      const pendingCode = window.localStorage.getItem(REFERRAL_STORAGE_KEY)?.trim();
      if (!pendingCode) {
        router.replace(isAdmin ? "/admin" : nextTarget);
        return;
      }

      try {
        await apiPost("/api/referrals/apply", {
          referral_code: pendingCode,
        });

        window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
        setSuccess("Referral kod je povezan sa vašim nalogom.");
      } catch (refError) {
        setError(refError?.message || "Referral kod nije moguće primeniti.");
      } finally {
        router.replace(isAdmin ? "/admin" : nextTarget);
      }
    };

    finalizeSignup();
  }, [isAdmin, loading, nextTarget, router, user]);

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

      await signInWithGoogle({ nextPath: nextTarget });
    } catch (err) {
      setError(err?.message || "Registracija nije uspela. Pokušajte ponovo.");
      setBusy(false);
    }
  };

  return (
    <AppShell title="Registracija" subtitle="Otvorite kandidatski nalog u jednom koraku." publicView>
      <section className="tfh-minimal-auth">
        <div className="tfh-minimal-left">
          <span className="tfh-minimal-kicker">Novi kandidat</span>
          <h2>Brza registracija</h2>
          <p>Registracija preko Google-a odmah kreira nalog i vodi vas direktno na Fazu 1.</p>
          <ul className="tfh-minimal-list">
            <li>Brzo kreiranje naloga</li>
            <li>Opcioni referral kod</li>
            <li>Direktan pristup dashboard-u</li>
          </ul>
        </div>

        <Card className="tfh-minimal-card tfh-minimal-primary">
          <CardBody className="gap-4">
            <h3>Registracija preko Google-a</h3>
            <p>Unesite referral kod ako ga imate, zatim nastavite.</p>

            <Input
              label="Referral kod (opciono)"
              placeholder="ABC123DEF4"
              value={referralCode}
              onValueChange={setReferralCode}
              variant="bordered"
            />

            <Button size="lg" onPress={onGoogleSignup} isLoading={busy} className="tfh-action-btn" fullWidth>
              {busy ? "Preusmeravanje..." : "Nastavi preko Google-a"}
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
              Već imam nalog
            </Button>
          </CardBody>
        </Card>
      </section>
    </AppShell>
  );
};

export default SignupPage;
