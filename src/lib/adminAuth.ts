export const ADMIN_COOKIE = "mt_admin";

/** Session token = SHA-256(password:secret). Works in both Edge middleware and Node. */
export async function adminToken(): Promise<string | null> {
  const pw = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!pw || !secret) return null;
  const data = new TextEncoder().encode(`${pw}:${secret}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isAdminCookie(value: string | undefined): Promise<boolean> {
  const t = await adminToken();
  return !!t && !!value && value === t;
}
