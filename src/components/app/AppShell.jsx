import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
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

const linkClass = (active) => (active ? "tfh-nav-link active" : "tfh-nav-link");

const AppShell = ({ title, subtitle, children }) => {
  const router = useRouter();
  const { user, isAdmin, signOut, isConfigured, configError, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdminRoute = router.pathname.startsWith("/admin");
  const showTeacherNav = Boolean(user && (!isAdmin || !isAdminRoute));
  const showAdminNav = Boolean(user && isAdmin);

  useEffect(() => {
    setMenuOpen(false);
  }, [router.asPath]);

  const onSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const isActive = (href) => {
    if (href === "/admin") return router.pathname.startsWith("/admin");
    return router.pathname === href;
  };

  return (
    <div className="tfh-app-shell">
      <header className="tfh-app-header">
        <div className="tfh-app-header-inner">
          <Link href="/" className="tfh-brand">
            <img src={appData.header.logo.image_white} alt="TeachFromHome" className="tfh-brand-logo" />
            <span className="tfh-brand-text">
              <strong>TeachFromHome</strong>
              <span>Teacher Portal</span>
            </span>
          </Link>

          <div className="tfh-header-right">
            {user && <span className="tfh-user-email">{user.email}</span>}

            {user && (
              <button
                type="button"
                className={`tfh-menu-toggle ${menuOpen ? "active" : ""}`}
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Toggle navigation"
                aria-expanded={menuOpen}
              >
                Menu
              </button>
            )}

            <div className="tfh-auth-box">
              {user ? (
                <>
                  {isAdmin && <span className="tfh-role-pill">Admin</span>}
                  <button className="tfh-btn tfh-btn-outline" type="button" onClick={onSignOut}>
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href={isAdminRoute ? "/admin/login" : "/login"} className="tfh-btn tfh-btn-outline">
                    Login
                  </Link>
                  <Link href="/apply" className="tfh-btn">
                    Apply now
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {user && (
          <div className={`tfh-nav-shell ${menuOpen ? "open" : ""}`}>
            {showTeacherNav && (
              <div className="tfh-nav-group">
                <span className="tfh-nav-label">Teacher</span>
                <nav className="tfh-nav" aria-label="Teacher navigation">
                  {teacherLinks.map((item) => (
                    <Link key={item.href} href={item.href} className={linkClass(isActive(item.href))}>
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            )}

            {showAdminNav && (
              <div className="tfh-nav-group tfh-nav-group-admin">
                <span className="tfh-nav-label">Admin</span>
                <nav className="tfh-nav" aria-label="Admin navigation">
                  {adminLinks.map((item) => (
                    <Link key={item.href} href={item.href} className={linkClass(isActive(item.href))}>
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="tfh-page">
        <div className="tfh-page-head">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {!loading && !isConfigured && (
          <div className="tfh-alert tfh-error">
            {configError ||
              "Supabase env variables are missing. Configure NEXT_PUBLIC_SUPABASE_URL and one publishable key (NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)."}
          </div>
        )}
        {children}
      </main>
    </div>
  );
};

export default AppShell;
