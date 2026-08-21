/**
 * WHO IS PAYING — established from the token, not from a cookie we wrote.
 *
 * THE FLAW THIS EXISTS TO CLOSE. `slp_uid` is a convenience cookie written at
 * login and read back verbatim; it is never checked against the session it
 * claims to describe. Everywhere else in the product that is harmless — it
 * only namespaces per-device UI state, so editing it scrambles your own
 * preferences and nothing more.
 *
 * For billing it is load-bearing, and it is not safe. `httpOnly` stops page
 * scripts from touching a cookie; it does not stop the person at the keyboard
 * from editing it in DevTools or sending their own `Cookie:` header. A learner
 * could therefore point `slp_uid` at somebody else's UUID and have their own
 * payment create a subscription on that account. They would be paying for a
 * stranger rather than stealing from one, so this is self-harm rather than
 * privilege escalation — but it is still the wrong account on a real charge,
 * an unexplainable entitlement, and a refund nobody can reconcile.
 *
 * The access token cannot be edited the same way. Its `sub` claim is the
 * Supabase user id, and while nothing here verifies its signature, the caller
 * has to present a token the BACKEND accepts before this id is used for
 * anything — a forged `sub` comes attached to a token that fails at Express.
 * Signature verification stays where the signing key is.
 */

function decodeSegment(segment: string): unknown {
  // JWT uses base64url; Buffer's "base64" decoder accepts it once the URL
  // alphabet is mapped back and padding restored.
  const normalised = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalised + "=".repeat((4 - (normalised.length % 4)) % 4);
  try {
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * The `sub` claim of an access token, or null if there isn't a usable one.
 *
 * Deliberately strict: three segments, a decodable payload, and a `sub` that
 * looks like the UUID the rest of the system uses. Anything else returns null
 * and the caller refuses — a checkout is not the place to be generous about
 * what an identity might be.
 */
export function subjectFromAccessToken(token: string | undefined | null): string | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payload = decodeSegment(parts[1]!);
  if (!payload || typeof payload !== "object") return null;
  const sub = (payload as Record<string, unknown>).sub;
  if (typeof sub !== "string") return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sub) ? sub : null;
}
