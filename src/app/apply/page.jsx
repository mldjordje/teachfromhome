"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody } from "@heroui/react";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";
import { trackVisitOnce } from "@library/analytics";

const NEXT_PHASE1 = "/teacher/phase1";
const flowSteps = [
  {
    step: "01",
    title: "Google ulaz",
    text: "Prijavis se jednim klikom — nema lozinke ni CV-a.",
  },
  {
    step: "02",
    title: "Faza 1 — audio",
    text: "Popunis podatke i snimas kratku glasovnu poruku po zadatom tekstu.",
  },
  {
    step: "03",
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
    <AppShell title="Kandidatska prijava" subtitle="Tri koraka do HR razgovora." publicView>
      <section className="tfh-minimal-auth tfh-minimal-auth--stacked tfh-apply-grid">
        <Card className="tfh-minimal-left tfh-apply-overview">
          <CardBody className="gap-4">
            <span className="tfh-minimal-kicker">TeachFromHome</span>
            <h2>Kako izgleda prijava?</h2>
            <p>Sve radi sa telefona. Nema posebne lozinke, nema CV upload-a — samo Google nalog i kratka glasovna poruka.</p>

            <div className="tfh-entry-timeline">
              {flowSteps.map((step) => (
                <article key={step.step} className="tfh-entry-timeline-item">
                  <span className="tfh-entry-timeline-number">{step.step}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.text}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="tfh-entry-note">
              Trajanje: oko 2 minuta. Tekst za citanje dobijas na sledecoj stranici.
            </div>
          </CardBody>
        </Card>

        <Card className="tfh-minimal-card tfh-minimal-primary">
          <CardBody className="gap-4">
            <h3>Pocni prijavu</h3>
            <p>Prijavi se Google nalogom i odmah nastavi na Fazu 1.</p>
            <Button as={Link} href={loginLink} size="lg" className="tfh-action-btn" fullWidth>
              Pocni prijavu
            </Button>
            <Button as={Link} href={signupLink} variant="flat" size="lg" className="tfh-action-btn tfh-action-btn--ghost" fullWidth>
              Imam referral kod
            </Button>
          </CardBody>
        </Card>
      </section>
    </AppShell>
  );
};

export default ApplyPage;
