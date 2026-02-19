import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@components/auth/AuthProvider";

const linkClass = (active) => (active ? "tfh-nav-link active" : "tfh-nav-link");

const AppShell = ({ title, subtitle, children }) => {
  const router = useRouter();
  const { user, isAdmin, signOut, isConfigured, configError, loading } = useAuth();

  const onSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="tfh-app-shell">
      <header className="tfh-app-header">
        <div className="tfh-app-header-inner">
          <Link href="/" className="tfh-brand">
            TeachFromHome
          </Link>

          {user && (
            <nav className="tfh-nav">
              <Link href="/teacher/dashboard" className={linkClass(router.pathname === "/teacher/dashboard")}>
                Dashboard
              </Link>
              <Link href="/teacher/phase1" className={linkClass(router.pathname === "/teacher/phase1")}>
                Phase 1
              </Link>
              <Link href="/teacher/phase2" className={linkClass(router.pathname === "/teacher/phase2")}>
                Phase 2
              </Link>
              <Link href="/teacher/notifications" className={linkClass(router.pathname === "/teacher/notifications")}>
                Notifications
              </Link>
              <Link href="/teacher/profile" className={linkClass(router.pathname === "/teacher/profile")}>
                Profile
              </Link>

              {isAdmin && (
                <>
                  <Link href="/admin" className={linkClass(router.pathname === "/admin")}>
                    Admin
                  </Link>
                  <Link href="/admin/phase1" className={linkClass(router.pathname === "/admin/phase1")}>
                    Admin Phase1
                  </Link>
                  <Link href="/admin/phase2" className={linkClass(router.pathname === "/admin/phase2")}>
                    Admin Phase2
                  </Link>
                  <Link href="/admin/training" className={linkClass(router.pathname === "/admin/training")}>
                    Training
                  </Link>
                  <Link href="/admin/referrals" className={linkClass(router.pathname === "/admin/referrals")}>
                    Referrals
                  </Link>
                </>
              )}
            </nav>
          )}

          <div className="tfh-auth-box">
            {user ? (
              <>
                <span className="tfh-user-email">{user.email}</span>
                <button className="tfh-btn tfh-btn-outline" type="button" onClick={onSignOut}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="tfh-btn tfh-btn-outline">
                  Login
                </Link>
                <Link href="/signup" className="tfh-btn">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
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
