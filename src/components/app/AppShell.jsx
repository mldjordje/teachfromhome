import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Alert, Button, Card, CardBody, Chip, Navbar, NavbarBrand, NavbarContent } from "@heroui/react";
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
  const { user, isAdmin, signOut, isConfigured, configError, loading } = useAuth();

  const isAdminRoute = router.pathname.startsWith("/admin");
  const publicRoutes = ["/login", "/signup", "/apply", "/admin/login"];
  const isPublicEntry = publicView || (!user && publicRoutes.includes(router.pathname));
  const showTeacherNav = Boolean(user && (!isAdmin || !isAdminRoute));
  const showAdminNav = Boolean(user && isAdmin);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [router.asPath]);

  const onSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const isActive = (href) => {
    if (href === "/admin") return router.pathname.startsWith("/admin");
    return router.pathname === href;
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
    if (router.pathname === "/apply") return { href: "/login", label: "Login" };
    if (router.pathname === "/signup") return { href: "/login", label: "Login" };
    if (router.pathname === "/admin/login") return { href: "/login", label: "Teacher login" };
    return { href: "/apply", label: "Apply now" };
  }, [isPublicEntry, router.pathname]);

  const navbarClassName = isPublicEntry
    ? "tfh-public-navbar"
    : "bg-slate-950 text-white";

  const brandLogo = isPublicEntry ? appData.header.logo.image : appData.header.logo.image_white;

  return (
    <div className="tfh-app-shell min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100">
      <Navbar maxWidth="2xl" isBordered className={navbarClassName}>
        <NavbarBrand>
          <Link href="/" className={`inline-flex items-center gap-3 ${isPublicEntry ? "text-slate-900" : "text-white"}`}>
            <img src={brandLogo} alt="TeachFromHome" className="h-9 w-9 rounded-lg object-cover" />
            <span className={`font-semibold tracking-wide ${isPublicEntry ? "text-sm text-slate-900" : "text-sm"}`}>
              TeachFromHome Portal
            </span>
          </Link>
        </NavbarBrand>

        <NavbarContent justify="end" className="items-center gap-2">
          {user ? (
            <>
              <Chip size="sm" variant="flat" className={isPublicEntry ? "hidden bg-slate-100 text-slate-700 md:inline-flex" : "hidden bg-white/15 text-white md:inline-flex"}>
                {user.email}
              </Chip>
              {isAdmin && (
                <Chip size="sm" color="warning" variant="flat">
                  Admin
                </Chip>
              )}
              <Button size="sm" variant="flat" color={isPublicEntry ? "primary" : "default"} onPress={onSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              {isPublicEntry ? (
                <Button as={Link} href={guestAction?.href || "/apply"} size="sm" color="primary" variant="flat">
                  {guestAction?.label || "Apply now"}
                </Button>
              ) : (
                <>
                  <Button as={Link} href={isAdminRoute ? "/admin/login" : "/login"} size="sm" variant="flat" color="default">
                    Login
                  </Button>
                  <Button as={Link} href="/apply" size="sm" color="primary">
                    Apply now
                  </Button>
                </>
              )}
            </>
          )}
        </NavbarContent>
      </Navbar>

      {user && allLinks.length > 0 && (
        <div className="mx-auto flex w-full max-w-[1220px] flex-wrap items-center gap-2 px-4 py-4">
          {allLinks.map((item) => (
            <Button
              key={item.href}
              as={Link}
              href={item.href}
              size="sm"
              variant={isActive(item.href) ? "solid" : "bordered"}
              color={item.scope === "Admin" ? "warning" : "primary"}
            >
              {item.label}
            </Button>
          ))}
        </div>
      )}

      <main className={`tfh-page mx-auto w-full px-4 pb-10 ${isPublicEntry ? "max-w-[1120px] pt-8" : "max-w-[1220px] pt-3"}`}>
        {isPublicEntry ? (
          <div className="tfh-minimal-head">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        ) : (
          <Card shadow="sm" className="mb-4 border border-slate-200">
            <CardBody className="gap-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">{title}</h1>
              {subtitle && <p className="text-sm text-slate-600 md:text-base">{subtitle}</p>}
            </CardBody>
          </Card>
        )}

        {!loading && !isConfigured && (
          <Alert
            color="danger"
            title={
              configError ||
              "Supabase env variables are missing. Configure NEXT_PUBLIC_SUPABASE_URL and one publishable key (NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)."
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
