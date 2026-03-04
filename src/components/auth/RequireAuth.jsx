"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

const RequireAuth = ({ children, adminOnly = false }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, loading } = useAuth();

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

  if (loading) {
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
