"use client";

import Link from "next/link";
import { Button } from "@heroui/react";
import AppShell from "@components/app/AppShell";
import ShowcaseVideoGrid from "@components/videos/ShowcaseVideoGrid";

const ClipsPage = () => {
  return (
    <AppShell
      title="Candidate Clips"
      subtitle="Watch selected accepted candidate samples and see the level expected in our onboarding flow."
      publicView
    >
      <section className="tfh-showcase-page">
        <div className="tfh-showcase-page-head">
          <p>
            Ovi primeri dolaze iz prihvacenih kandidata i prikazuju kvalitet govora, energiju i jasnocu prezentacije koji trazimo.
          </p>
          <div className="tfh-showcase-page-actions">
            <Button as={Link} href="/apply" color="primary" className="tfh-action-btn">
              Apply now
            </Button>
          </div>
        </div>

        <ShowcaseVideoGrid />
      </section>
    </AppShell>
  );
};

export default ClipsPage;
