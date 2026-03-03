import Link from "next/link";
import AppShell from "@components/app/AppShell";
import ShowcaseVideoGrid from "@components/videos/ShowcaseVideoGrid";

const ClipsPage = () => {
  return (
    <AppShell
      title="Accepted Candidate Clips"
      subtitle="Watch selected intro clips from accepted TeachFromHome candidates."
      publicView
    >
      <section className="tfh-showcase-page">
        <div className="tfh-showcase-page-head">
          <p>
            Real examples from successful applications. Clips are curated by the admin team and updated automatically.
          </p>
          <div className="tfh-showcase-page-actions">
            <Link href="/apply" className="tfh-public-nav-btn">
              Apply now
            </Link>
          </div>
        </div>

        <ShowcaseVideoGrid />
      </section>
    </AppShell>
  );
};

export default ClipsPage;
