import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Lewati static assets, internal Next.js, dan endpoint API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get("fnr_session")?.value;
  const isLoginPage = pathname === "/login";

  // Jika belum login dan mengakses halaman yang diproteksi
  if (!sessionCookie && !isLoginPage) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Jika sudah login dan mencoba mengakses /login kembali
  if (sessionCookie && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Proteksi Akses Berbasis Peran (3-Tier RBAC)
  if (sessionCookie && !isLoginPage) {
    try {
      const user = JSON.parse(decodeURIComponent(sessionCookie));
      const role = user?.role || "member";

      // 1. Halaman khusus Kepala Keluarga (admin): /family & /logs
      if ((pathname.startsWith("/family") || pathname.startsWith("/logs")) && role !== "admin") {
        const redirectUrl = new URL("/", req.url);
        redirectUrl.searchParams.set("access_denied", "admin_only");
        return NextResponse.redirect(redirectUrl);
      }

      // 2. Halaman khusus Kepala Keluarga & Pengelola: /assets & /vault (blokir role 'member')
      if ((pathname.startsWith("/assets") || pathname.startsWith("/vault")) && role === "member") {
        const redirectUrl = new URL("/", req.url);
        redirectUrl.searchParams.set("access_denied", "restricted");
        return NextResponse.redirect(redirectUrl);
      }
    } catch {
      // In case session cookie is corrupted, allow request to proceed to client handler
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
