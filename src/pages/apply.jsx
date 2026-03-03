import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button, Card, CardBody } from "@heroui/react";
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
    <AppShell title="Start Application" subtitle="Create account or continue where you left off." publicView>
      <section className="tfh-minimal-auth">
        <div className="tfh-minimal-left">
          <span className="tfh-minimal-kicker">Teacher onboarding</span>
          <h2>Start in under 2 minutes</h2>
          <p>
            Clean, fast flow. Login with Google, fill Phase 1 details, upload your intro, and move into review.
          </p>
          <ul className="tfh-minimal-list">
            <li>No password setup</li>
            <li>Direct access to dashboard</li>
            <li>Mobile-first workflow</li>
          </ul>
        </div>

        <div className="tfh-minimal-right">
          <Card className="tfh-minimal-card">
            <CardBody className="gap-4">
              <h3>I already have account</h3>
              <p>Continue directly to your onboarding dashboard and Phase 1 form.</p>
              <Button as={Link} href={loginLink} size="lg" className="tfh-action-btn" fullWidth>
                Login
              </Button>
            </CardBody>
          </Card>

          <Card className="tfh-minimal-card">
            <CardBody className="gap-4">
              <h3>I am a new candidate</h3>
              <p>Create account instantly with Google auth and start application.</p>
              <Button as={Link} href={signupLink} variant="flat" size="lg" className="tfh-action-btn tfh-action-btn--ghost" fullWidth>
                Create account
              </Button>
            </CardBody>
          </Card>
        </div>
      </section>
    </AppShell>
  );
};

export default ApplyPage;
