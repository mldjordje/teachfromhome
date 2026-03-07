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
    <AppShell title="Prijava kandidata" subtitle="Uloguj se ili napravi nalog i kreni sa Fazom 1." publicView>
      <section className="tfh-minimal-auth tfh-minimal-auth--stacked tfh-apply-grid">
        <Card className="tfh-minimal-left tfh-apply-overview">
          <CardBody className="gap-4">
            <span className="tfh-minimal-kicker">Onboarding proces</span>
            <h2>2 faze selekcije</h2>
            <p>Jasan tok prijave, bez dodatnih koraka van platforme.</p>

            <div className="tfh-apply-step-grid">
              <article className="tfh-apply-step">
                <strong>Korak 1</strong>
                <p>Popunis osnovne podatke i posaljes audio za fazu 1.</p>
              </article>
              <article className="tfh-apply-step">
                <strong>Korak 2</strong>
                <p>Admin pregledava prijavu i javlja rezultat.</p>
              </article>
              <article className="tfh-apply-step">
                <strong>Korak 3</strong>
                <p>Nakon prolaza dobijas zadatak za fazu 2.</p>
              </article>
            </div>

            <div className="tfh-apply-script-block">
              <span>Faza 1: tekst koji se cita</span>
              <p>{PHASE1_SHARED_SCRIPT_TEXT}</p>
            </div>
          </CardBody>
        </Card>

        <div className="tfh-minimal-right tfh-auth-choice-grid">
          <Card className="tfh-minimal-card tfh-auth-choice">
            <CardBody className="gap-4">
              <h3>Vec imam nalog</h3>
              <p>Nastavi direktno na dashboard i Fazu 1.</p>
              <Button as={Link} href={loginLink} size="lg" className="tfh-action-btn" fullWidth>
                Prijava
              </Button>
            </CardBody>
          </Card>

          <Card className="tfh-minimal-card tfh-auth-choice">
            <CardBody className="gap-4">
              <h3>Novi kandidat</h3>
              <p>Napravi nalog preko Google-a i odmah zapocni proces.</p>
              <Button
                as={Link}
                href={signupLink}
                variant="flat"
                size="lg"
                className="tfh-action-btn tfh-action-btn--ghost"
                fullWidth
              >
                Registracija
              </Button>
            </CardBody>
          </Card>
        </div>
      </section>
    </AppShell>
  );
};

export default ApplyPage;
