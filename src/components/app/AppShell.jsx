"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Alert, Card, CardBody, Chip } from "@heroui/react";
import { motion } from "framer-motion";
import appData from "@data/app.json";
import { useAuth } from "@components/auth/AuthProvider";

const teacherLinks = [
  { href: "/teacher/dashboard", label: "Moj status" },
  { href: "/teacher/phase1", label: "Faza 1" },
  { href: "/teacher/phase2", label: "Faza 2" },
  { href: "/teacher/notifications", label: "Obavestenja" },
  { href: "/teacher/profile", label: "Profil" },
];

const adminLinks = [
  { href: "/admin", label: "Admin po\u010detna" },
  { href: "/admin/phase1", label: "Admin faza 1" },
  { href: "/admin/phase2", label: "Admin faza 2" },
  { href: "/admin/accepted", label: "Prihvaceni" },
  { href: "/admin/training", label: "Trening klipovi" },
  { href: "/admin/referrals", label: "Preporuke" },
  { href: "/admin/showcase", label: "Showcase" },
  { href: "/admin/candidates", label: "Kandidati" },
];

const AppShell = ({ title, subtitle, children, publicView = false }) => {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const { user, isAdmin, signOut, isConfigured, configError, loading } = useAuth();

  const isAdminRoute = pathname.startsWith("/admin");
  const isTeacherRoute = pathname.startsWith("/teacher");
  const publicRoutes = ["/login", "/signup", "/apply", "/admin/login", "/clips"];
  const isPublicEntry = publicView || (!user && publicRoutes.includes(pathname));
  const showTeacherNav = Boolean(user && isTeacherRoute);
  const showAdminNav = Boolean(user && isAdmin && isAdminRoute);
  const isAuthEntry = ["/login", "/signup", "/admin/login"].includes(pathname);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const pageRoot = document.querySelector(".tfh-page");
    if (!(pageRoot instanceof HTMLElement)) return undefined;

    const selector = [
      ".tfh-page-head-card",
      ".tfh-card",
      ".tfh-kpi-panel",
      ".tfh-admin-panel-card",
      ".tfh-minimal-head",
      ".tfh-minimal-left",
      ".tfh-minimal-card",
      ".tfh-alert",
      "section[data-animate]",
    ].join(",");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = new WeakSet();
    let order = 0;

    const observer = reduceMotion
      ? null
      : new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add("is-visible");
              observer?.unobserve(entry.target);
            });
          },
          {
            threshold: 0.2,
            rootMargin: "0px 0px -10% 0px",
          },
        );

    const registerTarget = (node) => {
      if (!(node instanceof HTMLElement)) return;
      if (seen.has(node) || node.classList.contains("tfh-no-reveal")) return;

      seen.add(node);
      node.classList.add("tfh-reveal-target");
      node.style.setProperty("--tfh-reveal-delay", `${Math.min(order, 6) * 45}ms`);
      order += 1;

      if (reduceMotion) {
        node.classList.add("is-visible");
        return;
      }

      observer?.observe(node);
    };

    const registerTargets = () => {
      pageRoot.querySelectorAll(selector).forEach((node) => {
        registerTarget(node);
      });
    };

    registerTargets();

    const mutationObserver = new MutationObserver(() => {
      registerTargets();
    });

    mutationObserver.observe(pageRoot, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      mutationObserver.disconnect();
    };
  }, [pathname]);

  const onSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const isActive = (href) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href;
  };

  const allLinks = useMemo(() => {
    const links = [];
    if (showTeacherNav) {
      links.push(...teacherLinks.map((item) => ({ ...item, scope: "Teacher" })));
    }
    if (showAdminNav) {
      links.push(...adminLinks.map((item) => ({ ...item, scope: "Admin" })));
    }
    return links;
  }, [showAdminNav, showTeacherNav]);

  const guestAction = useMemo(() => {
    if (!isPublicEntry) return null;
    if (pathname === "/apply") return { href: "/login", label: "Prijava" };
    if (pathname === "/login") return { href: "/login?auto=1", label: "Google prijava" };
    if (pathname === "/signup") return { href: "/login", label: "Prijava" };
    if (pathname === "/admin/login") return { href: "/login", label: "Prijava kandidata" };
    return { href: "/apply", label: "Prijavi se" };
  }, [isPublicEntry, pathname]);

  const brandLogo = isPublicEntry ? appData.header.logo.image : appData.header.logo.image_white;
  const shellTone = isAdminRoute ? "admin" : "teacher";

  return (
    <div
      className={`tfh-app-shell ${isPublicEntry ? "tfh-app-shell--public" : "tfh-app-shell--portal"} ${
        isPublicEntry ? "" : `tfh-app-shell--${shellTone}`
      }`}
    >
      <header className={isPublicEntry ? "tfh-topbar tfh-topbar--public" : "tfh-topbar tfh-topbar--portal"}>
        <div className="tfh-topbar-inner">
          <Link href="/" className="tfh-shell-brand">
            <img src={brandLogo} alt="TeachFromHome" className="tfh-brand-mark" />
            <span className="tfh-brand-copy">
              <strong>TeachFromHome</strong>
              <small>{isPublicEntry ? "Online onboarding" : isAdminRoute ? "Admin Portal" : "Teacher Portal"}</small>
            </span>
          </Link>

          <div className="tfh-shell-actions">
            {user ? (
              <>
                <Chip size="sm" variant="flat" className="tfh-user-chip hidden md:inline-flex">
                  {user.email}
                </Chip>
                {isAdmin && !isPublicEntry && (
                  <Chip size="sm" variant="flat" className="tfh-admin-chip">
                    Admin
                  </Chip>
                )}
                <button type="button" className="tfh-topbar-btn tfh-topbar-btn--ghost" onClick={onSignOut}>
                  Odjavi se
                </button>
              </>
            ) : (
              <>
                {isPublicEntry ? (
                  <Link href={guestAction?.href || "/apply"} className="tfh-topbar-btn tfh-topbar-btn--solid">
                    {guestAction?.label || "Prijavi se"}
                  </Link>
                ) : (
                  <>
                    <Link href={isAdminRoute ? "/admin/login" : "/login"} className="tfh-topbar-btn tfh-topbar-btn--ghost">
                      Prijava
                    </Link>
                    <Link href="/apply" className="tfh-topbar-btn tfh-topbar-btn--solid">
                      Prijavi se
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {user && allLinks.length > 0 && !isPublicEntry && (
        <nav className="tfh-portal-nav-wrap">
          <div className="tfh-portal-nav">
            {allLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`tfh-portal-nav-link ${item.scope === "Admin" ? "is-admin" : "is-teacher"} ${
                  isActive(item.href) ? "is-active" : ""
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 18, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        className={`tfh-page ${isPublicEntry ? "tfh-page--public" : "tfh-page--portal"} ${
          isAdminRoute && !isPublicEntry ? "tfh-page--admin" : ""
        } ${isAuthEntry ? "tfh-page--auth" : ""}`}
      >
        <span className="tfh-visually-hidden" aria-hidden="true">
          {"\u010D\u0107\u017E\u0161\u0111 \u010C\u0106\u017D\u0160\u0110"}
        </span>

        {isPublicEntry ? (
          <div className="tfh-minimal-head">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        ) : (
          <Card shadow="none" className="tfh-page-head-card mb-5">
            <CardBody className="tfh-page-head-body gap-2">
              <h1 className="tfh-page-title text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
              {subtitle && <p className="tfh-page-subtitle text-sm md:text-base">{subtitle}</p>}
            </CardBody>
          </Card>
        )}

        {!loading && !isConfigured && (
          <Alert
            color="danger"
            title={
              configError ||
              "Authentication or backend configuration is missing. Check AUTH_* and POSTGRES/BLOB env variables."
            }
            className="mb-4"
          />
        )}

        {children}
      </motion.main>
    </div>
  );
};

export default AppShell;
