import { NextResponse, type NextRequest } from "next/server";

// Presence-only check on the edge — do not import Prisma or call auth() here.
// Auth.js v5 database sessions can't hydrate on the edge runtime.
const AUTH_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export function middleware(req: NextRequest) {
  const hasSession = AUTH_COOKIES.some((c) => req.cookies.has(c));
  const path = req.nextUrl.pathname;

  const requiresAuth =
    path.startsWith("/me") ||
    path.startsWith("/matches") ||
    path.startsWith("/trades") ||
    path.startsWith("/lgs") ||
    path === "/onboarding";

  if (requiresAuth && !hasSession) {
    return NextResponse.redirect(new URL("/signin", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/me/:path*",
    "/matches/:path*",
    "/trades/:path*",
    "/lgs/:path*",
    "/onboarding",
  ],
};
