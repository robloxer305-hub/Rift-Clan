import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Middleware runs before every matched request.
 * Protected paths (/profile, /admin) require an active session;
 * unauthenticated visitors are redirected to /login with a callbackUrl.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const protectedPaths = ["/profile", "/admin"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Run on everything except static files, images, and the favicon
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
