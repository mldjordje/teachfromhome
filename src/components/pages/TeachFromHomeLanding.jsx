import Link from "next/link";
import { useLanguage } from "@components/i18n/LanguageProvider";
import ShowcaseVideoGrid from "@components/videos/ShowcaseVideoGrid";

const content = {
  sr: {
    badge: "TeachFromHome.app",
    title: "Predaj engleski online i radi od kuće",
    subtitle:
      "Fleksibilan raspored, internacionalni učenici i brz onboarding. Prijava je jednostavna i traje 2 faze.",
    ctaApply: "Prijavi se",
    ctaProcess: "Pogledaj proces",
    whyTitle: "Zašto kandidati biraju TeachFromHome",
    whyItems: [
      {
        title: "Remote pozicija",
        text: "Predaješ iz svog prostora, bez putovanja i kancelarije.",
        image: "/images/teachfromhome/hero1-desktop.jpeg",
      },
      {
        title: "Fleksibilno vreme",
        text: "Raspored prilagođavaš sebi i svojoj dostupnosti.",
        image: "/images/teachfromhome/hero2-desktop.jpeg",
      },
      {
        title: "Stabilna saradnja",
        text: "Jasna podrška tima i dugoročni rast zarade.",
        image: "/images/teachfromhome/image1.jpeg",
      },
    ],
    aboutTitle: "O poslu",
    aboutText:
      "Traži se tečan engleski, profesionalna komunikacija i pouzdana internet konekcija. Iskustvo u predavanju je plus, ali nije obavezno za sve pozicije.",
    earningsTitle: "Zarada",
    earningsCards: [
      { label: "Početna mesečna zarada", value: "40.000+ RSD" },
      { label: "Potencijal mesečne zarade", value: "100.000+ RSD" },
      { label: "Početak nakon odobrenja", value: "~2 dana" },
    ],
    processTitle: "Proces prijave u 2 faze",
    processSteps: [
      "Napraviš nalog i popuniš profil.",
      "U Fazi 1 sam biraš tekst, uneseš ga i šalješ intro video.",
      "Ako prođeš, dobijaš zadatak za Fazu 2.",
      "Nakon prihvatanja, tim te kontaktira za start.",
    ],
    showcaseTitle: "Klipovi primljenih kandidata",
    showcaseText: "Pogledaj kratke YouTube klipove kandidata koji su uspešno prošli proces.",
    showcaseCta: "Pogledaj sve klipove",
    finalTitle: "Pozicije se brzo popunjavaju",
    finalText: "Prijave se pregledaju svakodnevno. Ako prođeš selekciju, možeš brzo da kreneš sa radom.",
  },
  en: {
    badge: "TeachFromHome.app",
    title: "Teach English Online and Work from Home",
    subtitle:
      "Flexible schedule, international students, and fast onboarding. The application flow is simple and split into 2 phases.",
    ctaApply: "Apply now",
    ctaProcess: "See process",
    whyTitle: "Why candidates choose TeachFromHome",
    whyItems: [
      {
        title: "Fully remote",
        text: "Teach from your own setup with no commute and no office overhead.",
        image: "/images/teachfromhome/hero1-mobile.jpeg",
      },
      {
        title: "Flexible schedule",
        text: "Build your own availability and adapt it to your routine.",
        image: "/images/teachfromhome/hero2-mobile.jpeg",
      },
      {
        title: "Long-term opportunity",
        text: "Structured team support with clear growth potential.",
        image: "/images/teachfromhome/image1.jpeg",
      },
    ],
    aboutTitle: "About the job",
    aboutText:
      "We look for fluent English, professional communication, and reliable internet. Teaching experience is a plus but not mandatory for every role.",
    earningsTitle: "Earnings",
    earningsCards: [
      { label: "Monthly starting range", value: "40,000+ RSD" },
      { label: "Monthly earning potential", value: "100,000+ RSD" },
      { label: "Start after approval", value: "~2 days" },
    ],
    processTitle: "2-step application process",
    processSteps: [
      "Create account and complete your profile.",
      "Submit your Phase 1 intro video.",
      "If approved, receive your Phase 2 task.",
      "After acceptance, team reaches out for onboarding.",
    ],
    showcaseTitle: "Accepted Candidate Clips",
    showcaseText: "Watch short YouTube clips from candidates who successfully completed the process.",
    showcaseCta: "See all clips",
    finalTitle: "Open slots are filling quickly",
    finalText: "Applications are reviewed daily. If selected, you can start quickly.",
  },
};

const TeachFromHomeLanding = () => {
  const { language } = useLanguage();
  const t = content[language === "en" ? "en" : "sr"];

  return (
    <div className="tfh-landing">
      <span className="tfh-visually-hidden" aria-hidden="true">
        čćžšđ ČĆŽŠĐ
      </span>
      <section id="home" className="tfh-landing-hero tfh-anchor-section">
        <picture className="tfh-hero-media">
          <source media="(min-width: 992px)" srcSet="/images/teachfromhome/hero1-desktop.jpeg" />
          <img src="/images/teachfromhome/hero1-mobile.jpeg" alt="TeachFromHome Hero" />
        </picture>

        <div className="tfh-hero-overlay" />

        <div className="container tfh-hero-content">
          <span className="tfh-hero-badge">{t.badge}</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
          <div className="tfh-hero-actions">
            <Link href="/apply" className="onovo-btn onovo-hover-btn">
              <i className="arrow"><span /></i>
              <span>{t.ctaApply}</span>
            </Link>
            <Link href="/#process" className="onovo-btn btn--border onovo-hover-btn">
              <i className="arrow"><span /></i>
              <span>{t.ctaProcess}</span>
            </Link>
          </div>
        </div>
      </section>

      <section id="why-join" className="tfh-anchor-section tfh-landing-section">
        <div className="container">
          <div className="onovo-heading gap-bottom-40">
            <h2 className="onovo-title-2"><span>{t.whyTitle}</span></h2>
          </div>
          <div className="tfh-why-grid">
            {t.whyItems.map((item) => (
              <article key={item.title} className="tfh-why-card">
                <img src={item.image} alt={item.title} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about-job" className="tfh-anchor-section tfh-landing-section tfh-about-section">
        <div className="container tfh-about-grid">
          <div>
            <h2>{t.aboutTitle}</h2>
            <p>{t.aboutText}</p>
          </div>
          <picture>
            <source media="(min-width: 992px)" srcSet="/images/teachfromhome/hero2-desktop.jpeg" />
            <img src="/images/teachfromhome/hero2-mobile.jpeg" alt="About job" />
          </picture>
        </div>
      </section>

      <section id="earnings" className="tfh-anchor-section tfh-landing-section tfh-earnings-section">
        <div className="container">
          <h2>{t.earningsTitle}</h2>
          <div className="tfh-earnings-grid">
            {t.earningsCards.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="process" className="tfh-anchor-section tfh-landing-section tfh-process-section">
        <div className="container tfh-process-grid">
          <picture>
            <source media="(min-width: 992px)" srcSet="/images/teachfromhome/hero2-desktop.jpeg" />
            <img src="/images/teachfromhome/hero2-mobile.jpeg" alt="Application process" />
          </picture>
          <div>
            <h2>{t.processTitle}</h2>
            <ol>
              {t.processSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="clips" className="tfh-anchor-section tfh-landing-section tfh-showcase-section">
        <div className="container">
          <div className="tfh-showcase-head">
            <h2>{t.showcaseTitle}</h2>
            <p>{t.showcaseText}</p>
          </div>

          <ShowcaseVideoGrid limit={3} compact />

          <div className="tfh-showcase-bottom">
            <Link href="/clips" className="tfh-public-nav-btn">
              {t.showcaseCta}
            </Link>
          </div>
        </div>
      </section>

      <section id="apply" className="tfh-anchor-section tfh-landing-section tfh-final-section">
        <div className="container tfh-final-card">
          <h2>{t.finalTitle}</h2>
          <p>{t.finalText}</p>
          <Link href="/apply" className="onovo-btn onovo-hover-btn">
            <i className="arrow"><span /></i>
            <span>{t.ctaApply}</span>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default TeachFromHomeLanding;
