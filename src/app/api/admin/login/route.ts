import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminToken } from "@/lib/adminAuth";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  const token = await adminToken();
  if (!token || !password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 12 });
  return res;
}
