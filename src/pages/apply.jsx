import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button, Card, CardBody, Chip } from "@heroui/react";
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
    <AppShell title="Start Application" subtitle="Login or create account to begin Phase 1." publicView>
      <section className="tfh-auth-grid">
        <div className="tfh-auth-visual">
          <img src="/images/teachfromhome/hero1-mobile.jpeg" alt="TeachFromHome" />
          <div className="tfh-auth-overlay" />
          <div className="tfh-auth-visual-content">
            <Chip color="primary" variant="flat" size="sm">TeachFromHome</Chip>
            <h2>Fast 2-step onboarding</h2>
            <p>Open account, submit Phase 1, and move quickly into review.</p>
          </div>
        </div>

        <div className="tfh-auth-cards">
          <Card className="tfh-auth-card">
            <CardBody className="gap-4">
              <h3>I already have account</h3>
              <p>Sign in and continue directly to the Phase 1 form and video upload.</p>
              <Button as={Link} href={loginLink} color="primary" size="lg" fullWidth>
                Login
              </Button>
            </CardBody>
          </Card>

          <Card className="tfh-auth-card">
            <CardBody className="gap-4">
              <h3>I am a new candidate</h3>
              <p>Create your account and continue directly to Phase 1.</p>
              <Button as={Link} href={signupLink} color="primary" variant="flat" size="lg" fullWidth>
                Register
              </Button>
            </CardBody>
          </Card>
        </div>
      </section>
    </AppShell>
  );
};

export default ApplyPage;
