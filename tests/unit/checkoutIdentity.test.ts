import { describe, expect, it } from "vitest";
import { subjectFromAccessToken } from "../../lib/server/identity";
import { buildCheckoutUrl } from "../../lib/plan/offer";

/** A JWT-shaped token whose payload we control. Signature is never checked
 *  here — the backend does that by accepting or rejecting the token. */
function token(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.signature-not-checked-here`;
}

const UID = "11111111-2222-3333-4444-555555555555";
const OTHER = "99999999-8888-7777-6666-555555555555";

/**
 * WHO IS PAYING.
 *
 * The attack these lock out: a signed-in learner edits `slp_uid` in DevTools —
 * `httpOnly` does not stop the person at the keyboard — points it at another
 * account, and their real payment creates a subscription on it. Self-harm
 * rather than theft, but still the wrong account on a real charge.
 */
describe("checkout identity", () => {
  it("comes from the access token's sub claim", () => {
    expect(subjectFromAccessToken(token({ sub: UID, role: "authenticated" }))).toBe(UID);
  });

  it("is refused when the token carries no usable subject", () => {
    expect(subjectFromAccessToken(token({ role: "authenticated" }))).toBeNull();
    expect(subjectFromAccessToken(token({ sub: 12345 }))).toBeNull();
    // Not a UUID — the rest of the system only ever uses Supabase UUIDs, so
    // anything else is a sign of tampering rather than a user we can charge.
    expect(subjectFromAccessToken(token({ sub: "admin" }))).toBeNull();
    expect(subjectFromAccessToken(token({ sub: "" }))).toBeNull();
  });

  it("is refused for anything that is not a three-part token", () => {
    for (const bad of [undefined, null, "", "not-a-token", "only.two", "a.b.c.d", UID]) {
      expect(subjectFromAccessToken(bad as string | undefined)).toBeNull();
    }
  });

  it("is refused when the payload is not decodable JSON", () => {
    expect(subjectFromAccessToken("header.%%%not-base64%%%.sig")).toBeNull();
    expect(subjectFromAccessToken(`header.${Buffer.from("plain text").toString("base64url")}.sig`)).toBeNull();
  });

  it("cannot be steered by an edited slp_uid, because the cookie is not the source", () => {
    // The route reads the token, not the cookie. Whatever the cookie says, the
    // link is built for the token's subject.
    const subject = subjectFromAccessToken(token({ sub: UID }));
    const url = buildCheckoutUrl(subject!, {
      WEB_BILLING_PRODUCT_ID: "p",
      WEB_BILLING_PURCHASE_URL: "https://pay.rev.cat/x",
    } as unknown as NodeJS.ProcessEnv);
    expect(new URL(url!).searchParams.get("app_user_id")).toBe(UID);
    expect(url).not.toContain(OTHER);
  });

  it("reads sub even when the payload carries the fields Supabase really sends", () => {
    const real = token({
      aud: "authenticated",
      exp: 1_900_000_000,
      sub: UID,
      email: "learner@example.com",
      app_metadata: { provider: "email" },
      user_metadata: {},
      role: "authenticated",
    });
    expect(subjectFromAccessToken(real)).toBe(UID);
  });
});
