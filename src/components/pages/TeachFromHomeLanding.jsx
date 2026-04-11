import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useLanguage } from "@components/i18n/LanguageProvider";
import ShowcaseVideoGrid from "@components/videos/ShowcaseVideoGrid";

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.45, ease: [0.2, 0.8, 0.2, 1] },
};

const ResponsiveMedia = ({ desktopSrc, mobileSrc, alt, className }) => (
  <div className={className}>
    <Image
      src={desktopSrc}
      alt={alt}
      fill
      className="tfh-responsive-media-image tfh-responsive-media-image--desktop"
      sizes="(max-width: 991px) 100vw, 50vw"
      quality={74}
    />
    <Image
      src={mobileSrc}
      alt={alt}
      fill
      className="tfh-responsive-media-image tfh-responsive-media-image--mobile"
      sizes="(max-width: 991px) 100vw, 50vw"
      quality={72}
    />
  </div>
);

const content = {
  sr: {
    badge: "TeachFromHome.app",
    eyebrow: "Remote posao za nastavnike engleskog",
    title: "Predaj engleski online i radi iz svog prostora",
    subtitle:
      "Fleksibilan raspored, spremni materijali i jasan onboarding: nalog, Faza 1 prijava, pregled i HR kontakt.",
    ctaApply: "Prijavi se",
    ctaClips: "Pogledaj klipove",
    heroPoints: ["Fleksibilne smene", "Rad od kuce", "Brz odgovor tima"],
    heroStats: [
      { value: "40.000+ RSD", label: "pocetna mesecna zarada" },
      { value: "4-14", label: "uzrast ucenika" },
      { value: "~2 dana", label: "moguc start nakon odobrenja" },
    ],
    benefitTitle: "Zasto kandidati biraju TeachFromHome",
    benefitCards: [
      {
        title: "Jasan pocetak",
        text: "Odmah znas sta treba da posaljes i koji je sledeci korak nakon pregleda.",
      },
      {
        title: "Materijali su spremni",
        text: "Roditelji ili platforma dostavljaju sadrzaj, pa nema klasicne pripreme casa od nule.",
      },
      {
        title: "Stabilan remote ritam",
        text: "Predajes iz svog prostora bez putovanja i kancelarijskog rasporeda.",
      },
      {
        title: "Podrska tima",
        text: "Tokom onboardinga imas jasne smernice, feedback i kontakt sa timom.",
      },
    ],
    roleTitle: "Kako izgleda posao",
    roleLead:
      "Trazi se tecan engleski, profesionalna komunikacija i stabilan internet. Iskustvo jeste plus, ali nije uslov.",
    roleParagraphs: [
      "Casovi se odrzavaju online sa decom iz Kine, uzrasta od 4 do 14 godina.",
      "Raspored je fleksibilan i prilagodjava se tvojoj dostupnosti, a deo otkazivanja je dozvoljen bez penala.",
      "ClassIn aplikacija je jednostavna za rad i koristi se kao glavni kanal za nastavu.",
    ],
    roleChecklistTitle: "Sta ti je potrebno",
    roleChecklist: [
      "stabilna internet konekcija",
      "headset sa mikrofonom",
      "kompjuter ili laptop",
      "mirno okruzenje za cas",
    ],
    supportTitle: "Sta dobijas od nas",
    supportCards: [
      {
        title: "Onboarding bez lutanja",
        text: "Prijava je skracena na jedan glavni korak, pa je proces pregledniji i brzi.",
      },
      {
        title: "Brzi pregled prijava",
        text: "Tim redovno proverava nove prijave i javlja sledece korake bez nepotrebnog cekanja.",
      },
      {
        title: "Realna zarada",
        text: "Mozes da krenes od dodatnog prihoda i postepeno gradis veci broj casova.",
      },
    ],
    showcaseTitle: "Klipovi prihvacenih kandidata",
    showcaseText: "Pogledaj kako izgleda energija, izgovor i stil kandidata koji su uspesno prosli selekciju.",
    showcaseCta: "Otvori sve klipove",
    processTitle: "Kako izgleda prijava",
    processSteps: [
      {
        step: "01",
        title: "Napravi nalog",
        text: "Prijavis se Google nalogom i odmah dobijas pristup svom profilu.",
      },
      {
        step: "02",
        title: "Posalji Fazu 1",
        text: "Popunis osnovne podatke i saljes audio prijavu po zadatom tekstu.",
      },
      {
        step: "03",
        title: "Sacekaj pregled",
        text: "Tim proverava izgovor, energiju i koliko jasno vodis prezentaciju.",
      },
      {
        step: "04",
        title: "Dobijas odgovor",
        text: "Ako prodjes, prelazis na HR kontakt i pripremu za pocetak rada.",
      },
    ],
    finalTitle: "Ako ti odgovara remote nastava, prijava moze da bude gotova danas",
    finalText:
      "Ne cekaj da se termini popune. Otvori nalog, posalji Fazu 1 i vidi brzo da li si dobar fit za TeachFromHome tim.",
  },
  en: {
    badge: "TeachFromHome.app",
    eyebrow: "Remote opportunity for English teachers",
    title: "Teach English online from your own setup",
    subtitle:
      "Flexible schedule, ready-made materials, and a simpler onboarding flow: account, Phase 1 submission, review, then HR contact.",
    ctaApply: "Apply now",
    ctaClips: "Watch clips",
    heroPoints: ["Flexible shifts", "Work from home", "Fast team feedback"],
    heroStats: [
      { value: "40,000+ RSD", label: "starting monthly earnings" },
      { value: "4-14", label: "student age range" },
      { value: "~2 days", label: "possible start after approval" },
    ],
    benefitTitle: "Why candidates choose TeachFromHome",
    benefitCards: [
      {
        title: "Clear starting point",
        text: "You always know what to submit first and what happens after the review.",
      },
      {
        title: "Materials are ready",
        text: "Parents or the platform provide the lesson content, so prep stays light.",
      },
      {
        title: "Stable remote routine",
        text: "Teach from home without commuting or office overhead.",
      },
      {
        title: "Team support",
        text: "You get clear guidance, feedback, and support during onboarding.",
      },
    ],
    roleTitle: "What the role looks like",
    roleLead:
      "We look for fluent English, professional communication, and reliable internet. Teaching experience is a plus, not a requirement.",
    roleParagraphs: [
      "Classes are held online with children in China, typically ages 4 to 14.",
      "Scheduling is flexible and adapts to your availability, with a limited number of no-penalty cancellations.",
      "The ClassIn app is simple to use and works as the main teaching environment.",
    ],
    roleChecklistTitle: "What you need",
    roleChecklist: ["stable internet", "headset with microphone", "computer or laptop", "quiet teaching environment"],
    supportTitle: "What you get from us",
    supportCards: [
      {
        title: "Shorter onboarding",
        text: "The flow now centers around one main application step, which makes everything faster and clearer.",
      },
      {
        title: "Fast reviews",
        text: "The team regularly checks new applications and sends the next steps quickly.",
      },
      {
        title: "Real earning potential",
        text: "You can start as a side income and gradually build a fuller schedule.",
      },
    ],
    showcaseTitle: "Accepted candidate clips",
    showcaseText: "See the energy, pronunciation, and delivery style of candidates who successfully passed the process.",
    showcaseCta: "Open all clips",
    processTitle: "How the application works",
    processSteps: [
      {
        step: "01",
        title: "Create your account",
        text: "Sign in with Google and get immediate access to your profile.",
      },
      {
        step: "02",
        title: "Submit Phase 1",
        text: "Complete your basic info and upload your audio introduction using the required script.",
      },
      {
        step: "03",
        title: "Wait for review",
        text: "The team checks pronunciation, energy, and how clearly you present yourself.",
      },
      {
        step: "04",
        title: "Get the result",
        text: "If approved, you move into HR contact and start preparation.",
      },
    ],
    finalTitle: "If remote teaching fits you, your application can be finished today",
    finalText:
      "Do not wait for slots to fill up. Create your account, submit Phase 1, and quickly find out whether you are a good fit for the TeachFromHome team.",
  },
};

const TeachFromHomeLanding = () => {
  const { language } = useLanguage();
  const t = content[language === "en" ? "en" : "sr"];

  return (
    <div className="tfh-landing tfh-home-landing">
      <span className="tfh-visually-hidden" aria-hidden="true">
        {"\u010D\u0107\u017E\u0161\u0111 \u010C\u0106\u017D\u0160\u0110"}
      </span>

      <section id="home" className="tfh-landing-hero tfh-home-hero tfh-anchor-section">
        <div className="tfh-hero-media tfh-hero-media--desktop">
          <Image
            src="/images/teachfromhome/hero1-desktop.jpeg"
            alt="TeachFromHome Hero"
            fill
            className="tfh-hero-media-image"
            priority
            sizes="100vw"
            quality={74}
          />
        </div>

        <div className="tfh-hero-media tfh-hero-media--mobile">
          <Image
            src="/images/teachfromhome/hero1-mobile.jpeg"
            alt="TeachFromHome Hero"
            fill
            className="tfh-hero-media-image"
            priority
            sizes="100vw"
            quality={72}
          />
        </div>

        <div className="tfh-hero-overlay tfh-home-hero-overlay" />

        <motion.div className="container tfh-home-hero-shell" {...reveal}>
          <div className="tfh-home-hero-copy">
            <span className="tfh-hero-badge">{t.badge}</span>
            <p className="tfh-home-eyebrow">{t.eyebrow}</p>
            <h1>{t.title}</h1>
            <p className="tfh-home-subtitle">{t.subtitle}</p>

            <div className="tfh-hero-actions">
              <Link href="/apply" className="tfh-landing-btn tfh-landing-btn--solid">
                {t.ctaApply}
              </Link>
              <Link href="/clips" className="tfh-landing-btn tfh-landing-btn--ghost">
                {t.ctaClips}
              </Link>
            </div>

            <div className="tfh-home-hero-points">
              {t.heroPoints.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>

          <div className="tfh-home-hero-panel">
            <div className="tfh-home-hero-panel-image">
              <Image
                src="/images/teachfromhome/image1.jpeg"
                alt="Remote teacher setup"
                fill
                sizes="(max-width: 991px) 100vw, 34vw"
                quality={72}
              />
            </div>
            <div className="tfh-home-hero-stats">
              {t.heroStats.map((item) => (
                <article key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </article>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <motion.section id="benefits" className="tfh-landing-section tfh-home-band tfh-anchor-section" {...reveal}>
        <div className="container">
          <div className="tfh-section-head tfh-home-section-head">
            <h2>{t.benefitTitle}</h2>
          </div>
          <div className="tfh-home-benefit-grid">
            {t.benefitCards.map((item) => (
              <article key={item.title} className="tfh-home-benefit-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section id="role" className="tfh-landing-section tfh-anchor-section" {...reveal}>
        <div className="container tfh-home-role-grid">
          <div className="tfh-home-role-copy">
            <h2>{t.roleTitle}</h2>
            <p className="tfh-home-role-lead">{t.roleLead}</p>
            {t.roleParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <div className="tfh-home-checklist">
              <h3>{t.roleChecklistTitle}</h3>
              <ul>
                {t.roleChecklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <ResponsiveMedia
            desktopSrc="/images/teachfromhome/hero2-desktop.jpeg"
            mobileSrc="/images/teachfromhome/hero2-mobile.jpeg"
            alt="Teach from home overview"
            className="tfh-responsive-media tfh-home-role-media"
          />
        </div>
      </motion.section>

      <motion.section id="support" className="tfh-landing-section tfh-home-support tfh-anchor-section" {...reveal}>
        <div className="container">
          <div className="tfh-home-section-head">
            <h2>{t.supportTitle}</h2>
          </div>
          <div className="tfh-home-support-grid">
            {t.supportCards.map((item) => (
              <article key={item.title} className="tfh-home-support-card">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section id="clips" className="tfh-anchor-section tfh-landing-section tfh-showcase-section" {...reveal}>
        <div className="container">
          <div className="tfh-showcase-head">
            <h2>{t.showcaseTitle}</h2>
            <p>{t.showcaseText}</p>
            <div className="tfh-clip-kpis">
              <span>Pronunciation</span>
              <span>Energy</span>
              <span>Clear delivery</span>
            </div>
          </div>

          <ShowcaseVideoGrid limit={3} compact />

          <div className="tfh-showcase-bottom">
            <Link href="/clips" className="tfh-landing-btn tfh-landing-btn--solid">
              {t.showcaseCta}
            </Link>
          </div>
        </div>
      </motion.section>

      <motion.section id="process" className="tfh-landing-section tfh-home-process tfh-anchor-section" {...reveal}>
        <div className="container">
          <div className="tfh-home-section-head">
            <h2>{t.processTitle}</h2>
          </div>
          <div className="tfh-home-process-grid">
            {t.processSteps.map((item) => (
              <article key={item.step} className="tfh-home-process-card">
                <span>{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section id="apply" className="tfh-anchor-section tfh-landing-section tfh-final-section" {...reveal}>
        <div className="container">
          <div className="tfh-final-card tfh-home-final-card">
            <h2>{t.finalTitle}</h2>
            <p>{t.finalText}</p>
            <Link href="/apply" className="tfh-landing-btn tfh-landing-btn--solid">
              {t.ctaApply}
            </Link>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default TeachFromHomeLanding;
