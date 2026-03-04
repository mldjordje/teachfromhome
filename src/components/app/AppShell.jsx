"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Alert, Card, CardBody, Chip } from "@heroui/react";
import appData from "@data/app.json";
import { useAuth } from "@components/auth/AuthProvider";

const teacherLinks = [
  { href: "/teacher/dashboard", label: "Dashboard" },
  { href: "/teacher/phase1", label: "Phase 1" },
  { href: "/teacher/phase2", label: "Phase 2" },
  { href: "/teacher/notifications", label: "Notifications" },
  { href: "/teacher/profile", label: "Profile" },
];

const adminLinks = [
  { href: "/admin", label: "Admin Home" },
  { href: "/admin/phase1", label: "Admin Phase 1" },
  { href: "/admin/phase2", label: "Admin Phase 2" },
  { href: "/admin/training", label: "Training Videos" },
  { href: "/admin/referrals", label: "Referrals" },
];

const AppShell = ({ title, subtitle, children, publicView = false }) => {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const { user, isAdmin, signOut, isConfigured, configError, loading } = useAuth();

  const isAdminRoute = pathname.startsWith("/admin");
  const publicRoutes = ["/login", "/signup", "/apply", "/admin/login"];
  const isPublicEntry = publicView || (!user && publicRoutes.includes(pathname));
  const showTeacherNav = Boolean(user && (!isAdmin || !isAdminRoute));
  const showAdminNav = Boolean(user && isAdmin);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    if (pathname === "/apply") return { href: "/login", label: "Login" };
    if (pathname === "/signup") return { href: "/login", label: "Login" };
    if (pathname === "/admin/login") return { href: "/login", label: "Teacher login" };
    return { href: "/apply", label: "Apply now" };
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
              <small>{isAdminRoute ? "Admin Portal" : "Teacher Portal"}</small>
            </span>
          </Link>

          <div className="tfh-shell-actions">
            {user ? (
              <>
                <Chip size="sm" variant="flat" className="tfh-user-chip hidden md:inline-flex">
                  {user.email}
                </Chip>
                {isAdmin && (
                  <Chip size="sm" variant="flat" className="tfh-admin-chip">
                    Admin
                  </Chip>
                )}
                <button type="button" className="tfh-topbar-btn tfh-topbar-btn--ghost" onClick={onSignOut}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                {isPublicEntry ? (
                  <Link href={guestAction?.href || "/apply"} className="tfh-topbar-btn tfh-topbar-btn--solid">
                    {guestAction?.label || "Apply now"}
                  </Link>
                ) : (
                  <>
                  <Link href={isAdminRoute ? "/admin/login" : "/login"} className="tfh-topbar-btn tfh-topbar-btn--ghost">
                      Login
                    </Link>
                    <Link href="/apply" className="tfh-topbar-btn tfh-topbar-btn--solid">
                      Apply now
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

      <main className={`tfh-page mx-auto w-full px-4 pb-10 ${isPublicEntry ? "max-w-[1120px] pt-8" : "max-w-[1220px] pt-6"}`}>
        {isPublicEntry ? (
          <div className="tfh-minimal-head">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        ) : (
          <Card shadow="none" className="tfh-page-head-card mb-5">
            <CardBody className="tfh-page-head-body gap-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">{title}</h1>
              {subtitle && <p className="text-sm text-slate-600 md:text-base">{subtitle}</p>}
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
      </main>
    </div>
  );
};

export default AppShell;
