import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Alert, Button, Card, CardBody, Input } from "@heroui/react";
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
    <AppShell title="Create account" subtitle="Open candidate account in one step." publicView>
      <section className="tfh-minimal-auth">
        <div className="tfh-minimal-left">
          <span className="tfh-minimal-kicker">New candidate</span>
          <h2>Minimal signup flow</h2>
          <p>
            Google sign-up creates your account instantly and sends you straight to Phase 1 onboarding.
          </p>
          <ul className="tfh-minimal-list">
            <li>Quick account creation</li>
            <li>Optional referral support</li>
            <li>Direct dashboard access</li>
          </ul>
        </div>

        <Card className="tfh-minimal-card tfh-minimal-primary">
          <CardBody className="gap-4">
            <h3>Create with Google</h3>
            <p>Add referral code if you have one, then continue.</p>

            <Input
              label="Referral code (optional)"
              placeholder="ABC123DEF4"
              value={referralCode}
              onValueChange={setReferralCode}
              variant="bordered"
            />

            <Button size="lg" onPress={onGoogleSignup} isLoading={busy} className="tfh-action-btn" fullWidth>
              {busy ? "Redirecting..." : "Continue with Google"}
            </Button>

            {error && <Alert color="danger" title={error} />}
            {success && <Alert color="success" title={success} />}
            {!isConfigured && <Alert color="danger" title={configError || "Supabase is not configured."} />}

            <Button
              as={Link}
              href={`/login?next=${encodeURIComponent(nextTarget)}`}
              variant="flat"
              className="tfh-action-btn tfh-action-btn--ghost"
              fullWidth
            >
              I already have account
            </Button>
          </CardBody>
        </Card>
      </section>
    </AppShell>
  );
};

export default SignupPage;
