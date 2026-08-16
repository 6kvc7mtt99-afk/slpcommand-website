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

export function refreshCookieOptions(maxAge = REFRESH_MAX_AGE) {
  return {
    httpOnly: true as const,
    secure: secureFlag(),
    sameSite: "lax" as const,
    path: "/api",
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
