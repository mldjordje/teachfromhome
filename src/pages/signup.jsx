import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";
import { callEdgeFunction } from "@library/edgeClient";
import { trackEvent } from "@library/analytics";

const SignupPage = () => {
  const router = useRouter();
  const { supabase, user, isAdmin, loading, isConfigured, configError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const nextFromQuery =
    typeof router.query.next === "string" && router.query.next.startsWith("/") ? router.query.next : null;
  const nextTarget = nextFromQuery || "/teacher/dashboard";

  useEffect(() => {
    if (loading || !user) return;

    if (isAdmin) {
      const adminTarget = nextFromQuery?.startsWith("/admin") ? nextFromQuery : "/admin";
      router.replace(adminTarget);
      return;
    }

    router.replace(nextTarget);
  }, [isAdmin, loading, nextFromQuery, nextTarget, router, user]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!supabase) {
      setError(configError || "Supabase is not configured.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    await trackEvent({ eventName: "started_signup", metadata: { channel: "web" } });

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setBusy(false);
      setError(signUpError.message);
      return;
    }

    const accessToken = data.session?.access_token || null;
    if (accessToken && referralCode.trim()) {
      try {
        await callEdgeFunction({
          functionName: "teacher_apply_referral_code",
          accessToken,
          body: { referral_code: referralCode.trim() },
        });
      } catch (refError) {
        console.warn("Referral link failed", refError);
      }
    }

    setBusy(false);
    setSuccess("Account created. You can now continue to your dashboard.");
    if (data.session) {
      router.push(nextTarget);
      return;
    }
  };

  return (
    <AppShell title="Create account" subtitle="Register as a teacher candidate.">
      <div className="tfh-grid tfh-grid-2">
        <div className="tfh-card">
          <h3>Sign up</h3>
          <form className="tfh-form" onSubmit={onSubmit}>
            <div>
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <label>Confirm password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <div>
              <label>Referral code (optional)</label>
              <input value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
            </div>

            {error && <div className="tfh-alert tfh-error">{error}</div>}
            {success && <div className="tfh-alert tfh-success">{success}</div>}
            {!isConfigured && <div className="tfh-alert tfh-error">{configError || "Supabase is not configured."}</div>}

            <div className="tfh-actions">
              <button className="tfh-btn" type="submit" disabled={busy}>
                {busy ? "Creating account..." : "Create account"}
              </button>
              <Link href={`/login?next=${encodeURIComponent(nextTarget)}`} className="tfh-btn tfh-btn-outline">
                I already have account
              </Link>
            </div>
          </form>
        </div>

        <div className="tfh-card">
          <h3>What happens next?</h3>
          <p>After signup, complete your profile and submit your Phase 1 intro video.</p>
          <p>Selected candidates move to Phase 2 where training videos and assigned sentence are provided.</p>
        </div>
      </div>
    </AppShell>
  );
};

export default SignupPage;

