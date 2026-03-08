"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody } from "@heroui/react";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";
import { PHASE1_SHARED_SCRIPT_TEXT } from "@config/phaseTexts";

const NEXT_PHASE1 = "/teacher/phase1";

const ApplyPage = () => {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;
    router.replace(isAdmin ? "/admin" : NEXT_PHASE1);
  }, [isAdmin, loading, router, user]);

  const loginLink = `/login?next=${encodeURIComponent(NEXT_PHASE1)}&auto=1`;
  const signupLink = `/signup?next=${encodeURIComponent(NEXT_PHASE1)}`;

  return (
    <AppShell title="Kandidatska prijava" subtitle="Jedan klik do Faze 1." publicView>
      <section className="tfh-minimal-auth tfh-minimal-auth--stacked tfh-apply-grid">
        <Card className="tfh-minimal-left tfh-apply-overview">
          <CardBody className="gap-4">
            <span className="tfh-minimal-kicker">TeachFromHome</span>
            <h2>Jednostavan tok prijave</h2>
            <p>Prijavi se Google nalogom i odmah nastavi na svoj sledeci korak.</p>

            <div className="tfh-apply-step-grid">
              <article className="tfh-apply-step">
                <strong>Faza 1</strong>
                <p>Profil + audio prijava.</p>
              </article>
              <article className="tfh-apply-step">
                <strong>Review</strong>
                <p>Admin proverava prijavu.</p>
              </article>
              <article className="tfh-apply-step">
                <strong>Faza 2</strong>
                <p>Dodeljen task i finalni snimak.</p>
              </article>
            </div>

            <div className="tfh-apply-script-block">
              <span>Tekst za Fazu 1</span>
              <p>{PHASE1_SHARED_SCRIPT_TEXT}</p>
            </div>
          </CardBody>
        </Card>

        <Card className="tfh-minimal-card tfh-minimal-primary">
          <CardBody className="gap-4">
            <h3>Nastavi preko Google-a</h3>
            <p>Vec imas nalog? Sistem ce sam prepoznati tvoj status prijave.</p>
            <Button as={Link} href={loginLink} size="lg" className="tfh-action-btn" fullWidth>
              Nastavi
            </Button>
            <Button as={Link} href={signupLink} variant="flat" size="lg" className="tfh-action-btn tfh-action-btn--ghost" fullWidth>
              Imam referral kod / prvi put sam ovde
            </Button>
          </CardBody>
        </Card>
      </section>
    </AppShell>
  );
};

export default ApplyPage;
