import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useLanguage } from "@components/i18n/LanguageProvider";
import ShowcaseVideoGrid from "@components/videos/ShowcaseVideoGrid";

const reveal = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
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
    title: "Predaj engleski online i radi od kuće",
    subtitle: "Fleksibilan raspored, internacionalni učenici i brz onboarding u 2 faze.",
    ctaApply: "Prijavi se",
    ctaProcess: "Pogledaj proces",
    whyTitle: "Zasto kandidati biraju TeachFromHome",
    whyItems: [
      {
        title: "Remote pozicija",
        text: "Predajes iz svog prostora bez putovanja i kancelarije.",
        image: "/images/teachfromhome/hero1-desktop.jpeg",
      },
      {
        title: "Fleksibilno vreme",
        text: "Raspored prilagodjavas sebi i svojoj dostupnosti.",
        image: "/images/teachfromhome/hero2-desktop.jpeg",
      },
      {
        title: "Stabilna saradnja",
        text: "Jasna podrska tima i dugorocni potencijal zarade.",
        image: "/images/teachfromhome/image1.jpeg",
      },
    ],
    aboutTitle: "O poslu",
    aboutLead:
      "Tražimo tečan engleski, profesionalnu komunikaciju i stabilnu internet konekciju. Iskustvo u predavanju je prednost, ali nije obavezno.",
    aboutParagraphs: [
      "Organizovan je trening i obuka za nove predavače, tako da kandidati mogu naučiti metodologiju rada i dobiti podršku na početku.",
      "Predavanje se održava online sa decom iz Kine uzrasta od 4 do 14 godina. Svi nastavni materijali su već obezbeđeni ili ih roditelji šalju unapred, tako da predavači ne moraju da pripremaju sopstveni materijal.",
      "Rad se odvija online, sa fleksibilnim radnim vremenom i mogućnošću rada od kuće. Određeni broj časova može biti otkazan od strane predavača bez plaćanja penala, što omogućava dodatnu fleksibilnost u organizaciji rasporeda.",
      "Časovi se održavaju putem ClassIn aplikacije, koja je jednostavna za korišćenje i namenjena online nastavi.",
    ],
    aboutEquipmentTitle: "Potrebna oprema za rad",
    aboutEquipment: [
      "stabilna i brza internet konekcija",
      "headset (slušalice sa mikrofonom)",
      "kompjuter ili laptop",
    ],
    aboutMobileNote:
      "Časovi se takođe mogu držati i preko mobilnog telefona, ukoliko predavaču to više odgovara.",
    earningsTitle: "Zarada",
    earningsCards: [
      { label: "Pocetna mesecna zarada", value: "40.000+ RSD" },
      { label: "Potencijal mesecne zarade", value: "100.000+ RSD" },
      { label: "Pocetak nakon odobrenja", value: "~2 dana" },
    ],
    processTitle: "Proces prijave u 2 faze",
    processSteps: [
      "Napravi nalog i popuni profil.",
      "U Fazi 1 sam biraš tekst, unosiš ga i šalješ glasovnu poruku.",
      "Ako prođeš, dobijaš zadatak za Fazu 2 i tada šalješ video snimak.",
      "Nakon prihvatanja, tim te kontaktira za start.",
    ],
    showcaseTitle: "Klipovi primljenih kandidata",
    showcaseText: "Pogledaj kratke klipove kandidata koji su uspešno prošli proces.",
    showcaseCta: "Pogledaj sve klipove",
    finalTitle: "Pozicije se brzo popunjavaju",
    finalText: "Prijave se pregledaju svakodnevno. Ako prodjes selekciju, brzo kreces sa radom.",
  },
  en: {
    badge: "TeachFromHome.app",
    title: "Teach English Online and Work from Home",
    subtitle: "Flexible schedule, international students, and fast onboarding in 2 phases.",
    ctaApply: "Apply now",
    ctaProcess: "See process",
    whyTitle: "Why candidates choose TeachFromHome",
    whyItems: [
      {
        title: "Fully remote",
        text: "Teach from your own setup with no commute and no office overhead.",
        image: "/images/teachfromhome/hero1-desktop.jpeg",
      },
      {
        title: "Flexible schedule",
        text: "Build your own availability and adapt it to your routine.",
        image: "/images/teachfromhome/hero2-desktop.jpeg",
      },
      {
        title: "Long-term opportunity",
        text: "Structured team support with clear growth potential.",
        image: "/images/teachfromhome/image1.jpeg",
      },
    ],
    aboutTitle: "About the job",
    aboutLead:
      "We look for fluent English, professional communication, and reliable internet. Teaching experience is a plus, but not required.",
    aboutParagraphs: [
      "Structured training is provided for new teachers, including onboarding support and methodology guidance.",
      "Classes are held online with children in China (ages 4-14). Teaching materials are already provided or sent by parents in advance.",
      "Work is fully remote with a flexible schedule and limited penalty-free class cancellations for better planning flexibility.",
      "Classes are conducted via the ClassIn app, designed for easy online teaching.",
    ],
    aboutEquipmentTitle: "Required equipment",
    aboutEquipment: ["stable high-speed internet", "headset (headphones with microphone)", "computer or laptop"],
    aboutMobileNote: "Classes can also be delivered from a mobile phone when preferred by the teacher.",
    earningsTitle: "Earnings",
    earningsCards: [
      { label: "Monthly starting range", value: "40,000+ RSD" },
      { label: "Monthly earning potential", value: "100,000+ RSD" },
      { label: "Start after approval", value: "~2 days" },
    ],
    processTitle: "2-step application process",
    processSteps: [
      "Create account and complete your profile.",
      "In Phase 1, provide your own short script and submit a voice message.",
      "If approved, receive your Phase 2 sentence and submit your video.",
      "After acceptance, team reaches out for onboarding.",
    ],
    showcaseTitle: "Accepted Candidate Clips",
    showcaseText: "Watch short clips from candidates who successfully completed the process.",
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
        {"\u010D\u0107\u017E\u0161\u0111 \u010C\u0106\u017D\u0160\u0110"}
      </span>

      <section id="home" className="tfh-landing-hero tfh-anchor-section">
        <div className="tfh-hero-media tfh-hero-media--desktop">
          <Image
            src="/images/teachfromhome/hero1-desktop.jpeg"
            alt="TeachFromHome Hero"
            fill
            className="tfh-hero-media-image"
            priority
            sizes="(max-width: 991px) 100vw, 100vw"
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

        <div className="tfh-hero-overlay" />

        <motion.div className="container tfh-hero-content" {...reveal}>
          <span className="tfh-hero-badge">{t.badge}</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
          <div className="tfh-hero-actions">
            <Link href="/apply" className="tfh-landing-btn tfh-landing-btn--solid">
              {t.ctaApply}
            </Link>
            <Link href="/#process" className="tfh-landing-btn tfh-landing-btn--ghost">
              {t.ctaProcess}
            </Link>
          </div>
        </motion.div>
      </section>

      <motion.section id="clips" className="tfh-anchor-section tfh-landing-section tfh-showcase-section" {...reveal}>
        <div className="container">
          <div className="tfh-showcase-head">
            <h2>{t.showcaseTitle}</h2>
            <p>{t.showcaseText}</p>
            <div className="tfh-clip-kpis">
              <span>Izgovor</span>
              <span>Energija</span>
              <span>Jasna struktura</span>
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

      <motion.section id="why-join" className="tfh-anchor-section tfh-landing-section" {...reveal}>
        <div className="container">
          <div className="tfh-section-head">
            <h2>{t.whyTitle}</h2>
          </div>
          <div className="tfh-why-grid">
            {t.whyItems.map((item) => (
              <article key={item.title} className="tfh-why-card">
                <div className="tfh-why-image">
                  <Image src={item.image} alt={item.title} fill sizes="(max-width: 991px) 100vw, 33vw" quality={72} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section id="about-job" className="tfh-anchor-section tfh-landing-section tfh-about-section" {...reveal}>
        <div className="container tfh-about-grid">
          <div className="tfh-about-copy">
            <h2>{t.aboutTitle}</h2>
            <p>{t.aboutLead}</p>
            {(t.aboutParagraphs || []).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <h3>{t.aboutEquipmentTitle}</h3>
            <ul>
              {(t.aboutEquipment || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>{t.aboutMobileNote}</p>
          </div>
          <ResponsiveMedia
            desktopSrc="/images/teachfromhome/hero2-desktop.jpeg"
            mobileSrc="/images/teachfromhome/hero2-mobile.jpeg"
            alt="About job"
            className="tfh-responsive-media"
          />
        </div>
      </motion.section>

      <motion.section id="earnings" className="tfh-anchor-section tfh-landing-section tfh-earnings-section" {...reveal}>
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
      </motion.section>

      <motion.section id="process" className="tfh-anchor-section tfh-landing-section tfh-process-section" {...reveal}>
        <div className="container tfh-process-grid">
          <ResponsiveMedia
            desktopSrc="/images/teachfromhome/hero2-desktop.jpeg"
            mobileSrc="/images/teachfromhome/hero2-mobile.jpeg"
            alt="Application process"
            className="tfh-responsive-media"
          />
          <div>
            <h2>{t.processTitle}</h2>
            <ol>
              {t.processSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </motion.section>

      <motion.section id="apply" className="tfh-anchor-section tfh-landing-section tfh-final-section" {...reveal}>
        <div className="container tfh-final-card">
          <h2>{t.finalTitle}</h2>
          <p>{t.finalText}</p>
          <Link href="/apply" className="tfh-landing-btn tfh-landing-btn--solid">
            {t.ctaApply}
          </Link>
        </div>
      </motion.section>
    </div>
  );
};

export default TeachFromHomeLanding;
