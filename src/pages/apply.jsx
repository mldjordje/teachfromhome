import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button, Card, CardBody, CardHeader, Divider } from "@heroui/react";
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
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">I already have account</h3>
          </CardHeader>
          <Divider />
          <CardBody className="gap-4">
            <p>Sign in and continue directly to the Phase 1 form and video upload.</p>
            <Button as={Link} href={loginLink} color="primary">
              Login
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">I am a new candidate</h3>
          </CardHeader>
          <Divider />
          <CardBody className="gap-4">
            <p>Create your account and continue directly to Phase 1.</p>
            <Button as={Link} href={signupLink} color="primary" variant="flat">
              Register
            </Button>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
};

export default ApplyPage;