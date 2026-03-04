import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import appData from "@data/app.json";
import { useLanguage } from "@components/i18n/LanguageProvider";

const HEADER_SCROLL_OFFSET = 12;

const DefaultHeader = () => {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = useMemo(() => {
    return appData.header.menu.map((item) => ({
      ...item,
      localizedLabel:
        language === "en"
          ? item.label_en || item.label || item.label_sr
          : item.label_sr || item.label || item.label_en,
    }));
  }, [language]);

  const buttonLabel =
    language === "en"
      ? appData.header.button.label_en || appData.header.button.label || appData.header.button.label_sr
      : appData.header.button.label_sr || appData.header.button.label || appData.header.button.label_en;

  const scrollToHash = (hash) => {
    if (typeof window === "undefined" || !hash) return;
    const targetId = hash.replace("#", "");
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    const header = document.querySelector(".tfh-public-header");
    const offset = (header?.offsetHeight || 88) + HEADER_SCROLL_OFFSET;
    const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);

    window.scrollTo({ top, behavior: "smooth" });
  };

  const isActive = (href) => {
    if (!href) return false;

    if (href.startsWith("/#")) {
      if (router.pathname !== "/") return false;
      const hash = href.split("#")[1] || "";
      return router.asPath.endsWith(`#${hash}`);
    }

    return router.pathname === href;
  };

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  const onNavClick = (event, href) => {
    if (!href || typeof href !== "string") return;

    if (!href.startsWith("/#")) {
      closeMobileMenu();
      return;
    }

    event.preventDefault();
    const hashPart = href.split("#")[1] || "";
    if (!hashPart) return;

    if (router.pathname !== "/") {
      closeMobileMenu();
      router.push(`/#${hashPart}`);
      return;
    }

    scrollToHash(`#${hashPart}`);
    closeMobileMenu();
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("tfh-menu-open", mobileOpen);
    return () => {
      document.body.classList.remove("tfh-menu-open");
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onRouteDone = (url) => {
      const hashIndex = url.indexOf("#");
      if (hashIndex === -1) return;
      const hash = url.slice(hashIndex);
      setTimeout(() => scrollToHash(hash), 10);
    };

    if (typeof window !== "undefined" && window.location.hash && router.pathname === "/") {
      setTimeout(() => scrollToHash(window.location.hash), 10);
    }

    router.events.on("routeChangeComplete", onRouteDone);
    return () => {
      router.events.off("routeChangeComplete", onRouteDone);
    };
  }, [router.events, router.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [router.asPath]);

  return (
    <header className="tfh-public-header">
      <div className="container tfh-public-header-inner">
        <Link href="/" className="tfh-public-brand">
          <img src={appData.header.logo.image} alt={appData.header.logo.alt} className="tfh-public-brand-mark" />
          <span className="tfh-public-brand-copy">
            <strong>TeachFromHome</strong>
            <small>{language === "en" ? "Online teacher pipeline" : "Online teacher proces"}</small>
          </span>
        </Link>

        <div className="tfh-public-head-actions">
          <div className="tfh-lang-switch tfh-lang-switch--desktop" role="group" aria-label="Language switch">
            <button type="button" className={language === "sr" ? "active" : ""} onClick={() => setLanguage("sr")}>
              SR
            </button>
            <button type="button" className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>
              EN
            </button>
          </div>

          <Link className="tfh-public-cta" href={appData.header.button.link}>
            <span className="tfh-public-cta-full">{buttonLabel}</span>
            <span className="tfh-public-cta-short">{language === "en" ? "Apply" : "Prijava"}</span>
          </Link>

          <button
            type="button"
            className={`tfh-public-menu-btn ${mobileOpen ? "is-open" : ""}`}
            aria-expanded={mobileOpen}
            aria-controls="tfh-public-nav"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <nav id="tfh-public-nav" className={`tfh-public-nav ${mobileOpen ? "is-open" : ""}`} aria-label="Primary navigation">
        <div className="container">
          <div className="tfh-public-nav-tools">
            <div className="tfh-lang-switch tfh-lang-switch--mobile" role="group" aria-label="Language switch menu">
              <button type="button" className={language === "sr" ? "active" : ""} onClick={() => setLanguage("sr")}>
                SR
              </button>
              <button type="button" className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>
                EN
              </button>
            </div>
          </div>

          <ul className="tfh-public-nav-list">
            {navItems.map((item) => (
              <li key={item.link}>
                <Link
                  href={item.link}
                  onClick={(event) => onNavClick(event, item.link)}
                  className={`tfh-public-nav-link ${isActive(item.link) ? "is-active" : ""}`}
                >
                  {item.localizedLabel}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
};

export default DefaultHeader;
