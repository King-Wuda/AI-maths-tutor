import { cookies } from "next/headers";

/** The anon_id cookie is set by middleware on first visit. */
export function anonId(): string | null {
  return cookies().get("anon_id")?.value ?? null;
}
