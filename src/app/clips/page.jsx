"use client";

import Link from "next/link";
import { Button, Card, CardBody } from "@heroui/react";
import { motion } from "framer-motion";
import AppShell from "@components/app/AppShell";
import ShowcaseVideoGrid from "@components/videos/ShowcaseVideoGrid";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] },
};

const ClipsPage = () => {
  return (
    <AppShell
      title="Klipovi kandidata"
      subtitle="Pogledaj primere prihvacenih kandidata i nivo koji ocekujemo u onboarding procesu."
      publicView
    >
      <section className="tfh-showcase-page tfh-showcase-page--enhanced">
        <motion.div className="tfh-showcase-page-head" {...fadeUp}>
          <div>
            <p>
              Ovi primeri prikazuju brzinu govora, energiju, dikciju i jasnocu prezentacije koju trazimo u selekciji.
            </p>
            <div className="tfh-clip-kpis">
              <span>Kriterijum: izgovor</span>
              <span>Kriterijum: energija</span>
              <span>Kriterijum: jasna struktura</span>
            </div>
          </div>
          <div className="tfh-showcase-page-actions">
            <Button as={Link} href="/apply" color="primary" className="tfh-action-btn">
              Zapocni prijavu
            </Button>
          </div>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }}>
          <ShowcaseVideoGrid />
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.12 }}>
          <Card className="tfh-admin-panel-card">
            <CardBody className="gap-3">
              <h3>Kako da koristis ove primere</h3>
              <p>1. Pogledaj ton i tempo govora.</p>
              <p>2. Obrati paznju na osvetljenje i kadar.</p>
              <p>3. U Fazi 1 biras svoj tekst i unosis ga u input pre slanja klipa.</p>
            </CardBody>
          </Card>
        </motion.div>
      </section>
    </AppShell>
  );
};

export default ClipsPage;