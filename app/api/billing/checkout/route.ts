import { NextResponse } from "next/server";
import { buildCheckoutUrl } from "@/lib/plan/offer";
import { readAuthCookies } from "@/lib/server/authCookies";
import { backendJson } from "@/lib/server/backend";
import { loadFeatureFlags } from "@/lib/server/home";
import { subjectFromAccessToken } from "@/lib/server/identity";

/**
 * The one door to a web purchase.
 *
 * Everything that decides WHO is buying happens here, on the server. The
 * browser sends no identity, no product and no price — it sends a request, and
 * gets back a link to RevenueCat's hosted checkout with the learner's own App
 * User ID already on it.
 *
 * THE BUG THIS SHAPE PREVENTS. If the checkout URL were assembled in the
 * browser, or if this route accepted an `app_user_id`, anyone could attach a
 * purchase to someone else's account — they pay, a stranger becomes Pro, and
 * the webhook would be entirely correct to honour it.
 *
 * WHICH IS WHY THE ID DOES NOT COME FROM `slp_uid`. That cookie is written at
 * login and never checked against the session; `httpOnly` keeps scripts out of
 * it but not the person at the keyboard, so it can be pointed at any UUID from
 * DevTools. The identity is taken from the access token's `sub` instead, and
 * the token is proved real by an authenticated call to the backend before that
 * id is used for anything (see lib/server/identity.ts).
 *
 * Gates, in order, each failing closed:
 *   1. a token with a usable `sub`   → 401
 *   2. the backend accepts it        → 401, and the client may refresh + retry
 *   3. `web_billing_enabled`         → 404, as if the door were never built
 *   4. offer configured              → 404, same
 *
 * The flag is read here as well as in the page because a page-level check is
 * a UI decision and this is an access decision. A stale tab, a hand-typed URL
 * or a flag switched off mid-session all arrive here, and all get the same
 * answer.
 */
export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await readAuthCookies();
  const subject = subjectFromAccessToken(auth.accessToken);
  if (!subject) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // Prove the token is one the backend accepts before building a payment link
  // from a claim inside it. `allowRefresh: false` on purpose: a refresh here
  // would rotate the token mid-request and leave us reasoning about a `sub`
  // read from the previous one. A stale token is the client's to fix — it
  // already has single-flight refresh — so say so and let it retry.
  const probe = await backendJson<unknown>({
    path: "/api/entitlements",
    cache: "no-store",
    allowRefresh: false,
  });
  if (probe.status === 401) {
    return NextResponse.json({ error: "session_stale" }, { status: 401 });
  }

  // Defence in depth, and a genuine signal: the two should never disagree, so
  // if they do, something has been edited and this is not a purchase to build.
  if (auth.userId && auth.userId !== subject) {
    return NextResponse.json({ error: "identity_mismatch" }, { status: 401 });
  }

  const flags = await loadFeatureFlags();
  if (!flags.web_billing_enabled) {
    // 404 rather than 403: while the switch is off there is no such endpoint,
    // and saying "forbidden" would advertise a route that does not yet exist
    // as a product.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const url = buildCheckoutUrl(subject);
  if (!url) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // The client follows this itself rather than being 302'd, so the page can
  // record that a checkout was started before the browser leaves.
  return NextResponse.json({ url }, { status: 200 });
}
