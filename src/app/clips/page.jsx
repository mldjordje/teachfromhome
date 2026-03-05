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
      subtitle="Pogledaj 2-3 ključna primera i započni prijavu."
      publicView
    >
      <section className="tfh-showcase-page tfh-showcase-page--enhanced">
        <motion.div className="tfh-showcase-page-head tfh-clips-head" {...fadeUp}>
          <div>
            <p>
              Gledamo izgovor, energiju i jasnu strukturu.
            </p>
            <div className="tfh-clip-kpis">
              <span>Izgovor</span>
              <span>Energija</span>
              <span>Jasna struktura</span>
            </div>
          </div>
          <div className="tfh-showcase-page-actions">
            <Button as={Link} href="/apply" color="primary" className="tfh-clips-cta">
              Započni prijavu
            </Button>
          </div>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }}>
          <ShowcaseVideoGrid />
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.12 }}>
          <Card className="tfh-admin-panel-card tfh-clips-note">
            <CardBody className="gap-3">
              <h3>Kako da koristiš ove primere</h3>
              <p>1. Pogledaj ton i tempo.</p>
              <p>2. Obrati pažnju na osvetljenje i kadar.</p>
              <p>3. U fazi 1 sam biraš tekst i šalješ glasovnu poruku.</p>
            </CardBody>
          </Card>
        </motion.div>
      </section>
    </AppShell>
  );
};

export default ClipsPage;
