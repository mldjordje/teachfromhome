import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "./AuthProvider";

const RequireAuth = ({ children, adminOnly = false }) => {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(router.asPath)}`);
      return;
    }

    if (adminOnly && !isAdmin) {
      router.replace("/teacher/dashboard");
    }
  }, [adminOnly, isAdmin, loading, router, user]);

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
