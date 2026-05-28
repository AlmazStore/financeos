import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/register"];
const API_AUTH = "/api/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_ROUTES.includes(pathname) || pathname.startsWith(API_AUTH);
  const isAuthed = !!req.auth;

  if (!isPublic && !isAuthed) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuthed && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.svg|.*\\.(?:png|svg|ico|webmanifest|jpg|jpeg|gif|webp)$).*)",
  ],
};
