"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    <AppShell
      title="Prijava kandidata"
      subtitle="Uloguj se ili napravi nalog i kreni odmah sa Fazom 1."
      publicView
    >
      <section className="tfh-minimal-auth tfh-minimal-auth--stacked">
        <Card className="tfh-minimal-left">
          <CardBody className="gap-4">
            <span className="tfh-minimal-kicker">Onboarding proces</span>
            <h2>3 faze selekcije</h2>
            <p>
              Kratko i jasno: sta radis po fazama i sta treba da pripremis pre slanja.
            </p>
            <ul className="tfh-minimal-list">
              <li>Faza 1: popuni osnovne podatke i snimi kratak video.</li>
              <li>Za Fazu 1 sam biras tekst koji izgovaras i unosis ga u input polje.</li>
              <li>Faza 2: detaljniji zadatak dobijas tek nakon prolaska Faze 1.</li>
              <li>Priprema: stabilan internet, tih prostor i jasno osvetljenje za snimanje.</li>
            </ul>
            <p className="tfh-charset-line">{"\u010D\u0107\u017E\u0161\u0111"}</p>
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