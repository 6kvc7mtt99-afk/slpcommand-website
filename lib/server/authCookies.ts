import { cookies } from "next/headers";

export const ACCESS_COOKIE = "slp_at";
export const REFRESH_COOKIE = "slp_rt";
export const UID_COOKIE = "slp_uid";
export const EMAIL_COOKIE = "slp_em";

const ACCESS_MAX_AGE = 60 * 60;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 14;

function secureFlag(): boolean {
  return process.env.NODE_ENV === "production";
}

export function accessCookieOptions(maxAge = ACCESS_MAX_AGE) {
  return {
    httpOnly: true as const,
    secure: secureFlag(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/**
 * Path=/ — the refresh token must be visible to PAGE routes, not only to /api.
 *
 * THE BUG THIS FIXES. This was `path: "/api"` while `slp_at` is Path=/ with a
 * one-hour max-age. A browser only sends a cookie whose path is a prefix of the
 * request path, so on a document request to /dashboard the refresh token was
 * never transmitted: `readAuthCookies()` saw neither token and
 * `app/(app)/layout.tsx` redirected to /login — with up to 13 days of refresh
 * token still valid. Close the tab, come back an hour later, and you were
 * signed out. Reproduced in tests/e2e/session-continuity.spec.ts before the
 * change, which is also why that test writes the path explicitly: Playwright's
 * addCookies({url}) defaults to Path=/ and would otherwise assert nothing.
 *
 * The client-side 401→refresh in lib/api/client.ts could never rescue this —
 * it only runs for fetches under /api once a page is already rendering, and
 * here the page never renders.
 *
 * SECURITY POSTURE IS UNCHANGED, and the narrower path was not buying any.
 * The cookie stays httpOnly (page JavaScript still cannot read it), Secure in
 * production, and SameSite=Lax. CSRF on state-changing requests is enforced by
 * the Origin check in middleware.ts, not by cookie path — and `slp_at`, which
 * grants the same API access, has always been Path=/. The only new surface is
 * that the token now rides along on same-origin document GETs, where nothing
 * reads it and no state changes.
 *
 * The published Cookie Policy states this path in three places
 * (content/legal.ts, content/legal/cookies.html, cookies.html); all three are
 * updated to match, and tests/unit/legalContentSync.test.ts holds them in sync.
 */
export function refreshCookieOptions(maxAge = REFRESH_MAX_AGE) {
  return {
    httpOnly: true as const,
    secure: secureFlag(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function identityCookieOptions(maxAge = REFRESH_MAX_AGE) {
  return {
    httpOnly: true as const,
    secure: secureFlag(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function readAuthCookies() {
  const jar = await cookies();
  return {
    accessToken: jar.get(ACCESS_COOKIE)?.value,
    refreshToken: jar.get(REFRESH_COOKIE)?.value,
    userId: jar.get(UID_COOKIE)?.value,
    email: jar.get(EMAIL_COOKIE)?.value,
  };
}

export async function setSessionCookies(input: {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}) {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, input.accessToken, accessCookieOptions());
  jar.set(REFRESH_COOKIE, input.refreshToken, refreshCookieOptions());
  jar.set(UID_COOKIE, input.userId, identityCookieOptions());
  jar.set(EMAIL_COOKIE, input.email, identityCookieOptions());
}

export async function clearSessionCookies() {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, "", accessCookieOptions(0));
  jar.set(REFRESH_COOKIE, "", refreshCookieOptions(0));
  jar.set(UID_COOKIE, "", identityCookieOptions(0));
  jar.set(EMAIL_COOKIE, "", identityCookieOptions(0));
}

export function hashToken(value: string): string {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}
