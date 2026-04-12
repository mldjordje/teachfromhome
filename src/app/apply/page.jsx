"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody } from "@heroui/react";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";
import { PHASE1_SHARED_SCRIPT_TEXT } from "@config/phaseTexts";
import { trackVisitOnce } from "@library/analytics";

const NEXT_PHASE1 = "/teacher/phase1";
const flowHighlights = [
  { label: "Trajanje", value: "2 min" },
  { label: "Prvi korak", value: "Google login" },
  { label: "Faza 1", value: "audio + profil" },
];
const flowSteps = [
  {
    title: "Google ulaz",
    text: "Prijavis se jednim klikom i sistem pamti tvoj status prijave.",
  },
  {
    title: "Posalji Fazu 1",
    text: "Popunis osnovne podatke i saljes audio prijavu po zadatom tekstu.",
  },
  {
    title: "Cekas odgovor",
    text: "Tim pregleda prijavu i javlja da li prelazis na HR kontakt.",
  },
];

const ApplyPage = () => {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    trackVisitOnce({ page: "apply" });
  }, []);

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
            <p>Prijavi se Google nalogom i odmah nastavi na Fazu 1. Nakon pregleda, dobijas odgovor i sledece korake od tima.</p>

            <div className="tfh-entry-metrics">
              {flowHighlights.map((item) => (
                <article key={item.label} className="tfh-entry-metric">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>

            <div className="tfh-entry-timeline">
              {flowSteps.map((step, index) => (
                <article key={step.title} className="tfh-entry-timeline-item">
                  <span className="tfh-entry-timeline-number">0{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.text}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="tfh-apply-script-block">
              <span>Tekst za Fazu 1</span>
              <p>{PHASE1_SHARED_SCRIPT_TEXT}</p>
            </div>

            <div className="tfh-entry-note">
              Nema posebne lozinke, nema CV upload-a i sve radi i sa telefona.
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
