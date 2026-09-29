import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, isAdminCookie } from "./lib/adminAuth";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminArea =
    (pathname.startsWith("/admin") && pathname !== "/admin/login") ||
    (pathname.startsWith("/api/admin") && pathname !== "/api/admin/login");
  if (isAdminArea && !(await isAdminCookie(req.cookies.get(ADMIN_COOKIE)?.value))) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const res = NextResponse.next();
  if (!req.cookies.get("anon_id") && !pathname.startsWith("/admin")) {
    res.cookies.set("anon_id", crypto.randomUUID(), {
      httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
