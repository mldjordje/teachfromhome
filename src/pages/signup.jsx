import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Alert, Button, Card, CardBody, Chip, Input } from "@heroui/react";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";
import { callEdgeFunction } from "@library/edgeClient";
import { trackEvent } from "@library/analytics";
import { getAccessTokenOrThrow, sanitizeNextPath, signInWithGoogle } from "@library/auth";

const REFERRAL_STORAGE_KEY = "tfh_pending_referral_code";

const SignupPage = () => {
  const router = useRouter();
  const { supabase, user, isAdmin, loading, isConfigured, configError } = useAuth();
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const nextTarget = sanitizeNextPath(
    typeof router.query.next === "string" ? router.query.next : null,
    "/teacher/dashboard",
  );

  useEffect(() => {
    if (loading || !user || typeof window === "undefined") return;

    const finalizeSignup = async () => {
      if (!supabase) {
        router.replace(nextTarget);
        return;
      }

      const pendingCode = window.localStorage.getItem(REFERRAL_STORAGE_KEY)?.trim();
      if (!pendingCode) {
        router.replace(isAdmin ? "/admin" : nextTarget);
        return;
      }

      try {
        const accessToken = await getAccessTokenOrThrow(supabase);
        await callEdgeFunction({
          functionName: "teacher_apply_referral_code",
          accessToken,
          body: { referral_code: pendingCode },
        });

        window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
        setSuccess("Referral code linked to your account.");
      } catch (refError) {
        setError(refError?.message || "Referral code could not be applied.");
      } finally {
        router.replace(isAdmin ? "/admin" : nextTarget);
      }
    };

    finalizeSignup();
  }, [isAdmin, loading, nextTarget, router, supabase, user]);

  const onGoogleSignup = async () => {
    setError("");
    setSuccess("");

    if (!supabase) {
      setError(configError || "Supabase is not configured.");
      return;
    }

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

      await signInWithGoogle({ supabase, nextPath: nextTarget });
    } catch (err) {
      setError(err?.message || "Signup failed. Please try again.");
      setBusy(false);
    }
  };

  return (
    <AppShell title="Create account" subtitle="Create candidate account with Google auth." publicView>
      <section className="tfh-auth-grid">
        <div className="tfh-auth-visual">
          <img src="/images/teachfromhome/hero1-mobile.jpeg" alt="Create Account" />
          <div className="tfh-auth-overlay" />
          <div className="tfh-auth-visual-content">
            <Chip color="primary" variant="flat" size="sm">Signup</Chip>
            <h2>Start teaching workflow</h2>
            <p>Create account, complete Phase 1, and move through review stages quickly.</p>
          </div>
        </div>

        <Card className="tfh-auth-card">
          <CardBody className="gap-4">
            <h3>Google signup</h3>
            <p>One click account creation with optional referral code.</p>

            <Input
              label="Referral code (optional)"
              placeholder="ABC123DEF4"
              value={referralCode}
              onValueChange={setReferralCode}
              variant="bordered"
            />

            <Button color="primary" size="lg" onPress={onGoogleSignup} isLoading={busy} fullWidth>
              {busy ? "Redirecting..." : "Continue with Google"}
            </Button>

            {error && <Alert color="danger" title={error} />}
            {success && <Alert color="success" title={success} />}
            {!isConfigured && <Alert color="danger" title={configError || "Supabase is not configured."} />}

            <Button as={Link} href={`/login?next=${encodeURIComponent(nextTarget)}`} variant="light" fullWidth>
              I already have account
            </Button>
          </CardBody>
        </Card>
      </section>
    </AppShell>
  );
};

export default SignupPage;
