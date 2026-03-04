import Link from "next/link";
import appData from "@data/app.json";
import { useLanguage } from "@components/i18n/LanguageProvider";

const quickLinks = [
  { href: "/#home", label_sr: "Po\u010detna", label_en: "Home" },
  { href: "/#process", label_sr: "Proces", label_en: "Process" },
  { href: "/clips", label_sr: "Klipovi", label_en: "Clips" },
  { href: "/apply", label_sr: "Prijava", label_en: "Apply" },
];

const DefaultFooter = () => {
  const { language } = useLanguage();
  const isEnglish = language === "en";

  return (
    <footer className="tfh-footer">
      <div className="container tfh-footer-grid">
        <section className="tfh-footer-card">
          <Link href="/" className="tfh-footer-brand">
            <img src={appData.footer.logo.image} alt={appData.footer.logo.alt} />
            <span>
              <strong>TeachFromHome</strong>
              <small>{isEnglish ? "Remote teacher onboarding" : "Remote teacher onboarding"}</small>
            </span>
          </Link>
          <p>
            {isEnglish
              ? "Fast online application flow, clear phases, and structured support from intro video to onboarding."
              : "Brz online proces prijave, jasne faze i strukturisana podr\u0161ka od intro klipa do onboardinga."}
          </p>
          <a href="mailto:info@teachfromhome.app" className="tfh-footer-mail">
            info@teachfromhome.app
          </a>
        </section>

        <section className="tfh-footer-card">
          <h4>{isEnglish ? "Quick links" : "Brzi linkovi"}</h4>
          <ul className="tfh-footer-links">
            {quickLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{isEnglish ? item.label_en : item.label_sr}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="tfh-footer-card">
          <h4>{isEnglish ? "Gallery" : "Galerija"}</h4>
          <div className="tfh-footer-gallery">
            {appData.footer.gallery.slice(0, 6).map((item, index) => (
              <figure key={`${item.image}-${index}`}>
                <img src={item.image} alt={item.alt || "TeachFromHome"} loading="lazy" />
              </figure>
            ))}
          </div>
        </section>
      </div>

      <div className="container tfh-footer-bottom">
        <p>{isEnglish ? "© 2026 TeachFromHome.app. All rights reserved." : "© 2026 TeachFromHome.app. Sva prava zadr\u017Eana."}</p>
        <ul className="tfh-footer-social">
          {appData.social.map((item) => (
            <li key={item.link}>
              <a href={item.link} target="_blank" rel="noreferrer" aria-label={item.title}>
                <i className={item.icon} />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
};

export default DefaultFooter;
