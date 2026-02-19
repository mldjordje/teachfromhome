import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";

const NEXT_PHASE1 = "/teacher/phase1";

const ApplyPage = () => {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    router.replace(isAdmin ? "/admin" : NEXT_PHASE1);
  }, [isAdmin, loading, router, user]);

  const loginLink = `/login?next=${encodeURIComponent(NEXT_PHASE1)}`;
  const signupLink = `/signup?next=${encodeURIComponent(NEXT_PHASE1)}`;

  return (
    <AppShell title="Start Application" subtitle="Login or create account to begin Phase 1.">
      <div className="tfh-grid tfh-grid-2">
        <div className="tfh-card">
          <h3>I already have account</h3>
          <p>Sign in and continue directly to the Phase 1 form and video upload.</p>
          <Link href={loginLink} className="tfh-btn">
            Login
          </Link>
        </div>
        <div className="tfh-card">
          <h3>I am a new candidate</h3>
          <p>Create your account and continue directly to Phase 1.</p>
          <Link href={signupLink} className="tfh-btn">
            Register
          </Link>
        </div>
      </div>
    </AppShell>
  );
};

export default ApplyPage;
