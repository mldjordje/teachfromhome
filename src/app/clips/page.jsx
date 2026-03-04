"use client";

import Link from "next/link";
import { Button } from "@heroui/react";
import AppShell from "@components/app/AppShell";
import ShowcaseVideoGrid from "@components/videos/ShowcaseVideoGrid";

const ClipsPage = () => {
  return (
    <AppShell
      title="Klipovi kandidata"
      subtitle="Pogledaj primere prihvaćenih kandidata i nivo koji očekujemo u onboarding procesu."
      publicView
    >
      <section className="tfh-showcase-page">
        <div className="tfh-showcase-page-head">
          <p>
            Ovi primeri dolaze iz prihvaćenih kandidata i prikazuju kvalitet govora, energiju i jasnoću prezentacije koju tražimo.
          </p>
          <div className="tfh-showcase-page-actions">
            <Button as={Link} href="/apply" color="primary" className="tfh-action-btn">
              Prijavi se
            </Button>
          </div>
        </div>

        <ShowcaseVideoGrid />
      </section>
    </AppShell>
  );
};

export default ClipsPage;
