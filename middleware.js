import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login"]);

export async function middleware(request) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET });

  const isAdminPath = pathname.startsWith("/admin");
  const isTeacherPath = pathname.startsWith("/teacher");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isTeacherApi = pathname.startsWith("/api/teacher");
  const isProtectedReferralApi = ["/api/referrals/mark-eligible", "/api/referrals/approve"].includes(pathname);

  if (isAdminPath && PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (isAdminPath || isTeacherPath || isAdminApi || isTeacherApi || isProtectedReferralApi) {
    if (!token?.userId) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const loginTarget = isAdminPath ? "/admin/login" : "/login";
      const next = `${pathname}${search || ""}`;
      const redirect = new URL(`${loginTarget}?next=${encodeURIComponent(next)}`, request.url);
      return NextResponse.redirect(redirect);
    }
  }

  if (isAdminPath || isAdminApi || isProtectedReferralApi) {
    if (token.isAdmin !== true) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
      }

      const redirect = new URL("/teacher/dashboard", request.url);
      return NextResponse.redirect(redirect);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/api/admin/:path*", "/api/teacher/:path*", "/api/referrals/:path*"],
};
