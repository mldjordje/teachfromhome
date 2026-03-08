"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { buildTeacherApplicationFlow, resolveTeacherGuardRedirect } from "@config/teacherFlow";

const RequireAuth = ({ children, adminOnly = false }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, loading } = useAuth();
  const [guardLoading, setGuardLoading] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const loginPath = adminOnly ? "/admin/login" : "/login";
      router.replace(`${loginPath}?next=${encodeURIComponent(pathname || "/")}`);
      return;
    }

    if (adminOnly && !isAdmin) {
      router.replace("/teacher/dashboard");
    }
  }, [adminOnly, isAdmin, loading, pathname, router, user]);

  useEffect(() => {
    if (loading || !user || adminOnly || isAdmin) {
      setGuardLoading(false);
      return;
    }

    const shouldGuardTeacherRoute = pathname === "/teacher/phase1" || pathname === "/teacher/phase2";
    if (!shouldGuardTeacherRoute) {
      setGuardLoading(false);
      return;
    }

    let active = true;
    const enforceTeacherFlow = async () => {
      setGuardLoading(true);
      try {
        const response = await fetch("/api/teacher/dashboard", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!response.ok) return;

        const payload = await response.json();
        if (!active) return;

        const flow = buildTeacherApplicationFlow({
          phase1Attempts: payload?.phase1Attempts || [],
          phase2Task: payload?.phase2Task || null,
        });
        const redirectTo = resolveTeacherGuardRedirect(pathname, flow);

        if (redirectTo && redirectTo !== pathname) {
          router.replace(redirectTo);
        }
      } catch (_error) {
        // no-op; fallback is page-level server validation
      } finally {
        if (active) {
          setGuardLoading(false);
        }
      }
    };

    enforceTeacherFlow();

    return () => {
      active = false;
    };
  }, [adminOnly, isAdmin, loading, pathname, router, user]);

  if (loading || guardLoading) {
    return <div className="tfh-page">Loading...</div>;
  }

  if (!user) {
    return <div className="tfh-page">Redirecting to login...</div>;
  }

  if (adminOnly && !isAdmin) {
    return <div className="tfh-page">Redirecting...</div>;
  }

  return children;
};

export default RequireAuth;
