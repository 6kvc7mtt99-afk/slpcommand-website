/**
 * THE WEB OFFER — one definition, server-side, or none at all.
 *
 * REQUIRED_EXTERNAL_CONFIGURATION, deliberately. The authoritative price for a
 * web purchase lives in RevenueCat, is localised per customer and may include
 * tax; this repo must never become a second opinion about what someone is
 * charged. So the product identifier and the purchase link come from the
 * server's environment, and if they are absent there is simply no offer — the
 * product does not guess, and does not fall back to a number typed into a
 * component.
 *
 * The display price is OPTIONAL for exactly that reason. When it is not
 * configured the page says what Pro includes and hands the learner to the
 * checkout, which states the real price before taking any money. A page that
 * quotes €X and a checkout that charges €Y is worse than a page that quotes
 * nothing.
 *
 * Nothing here is read in the browser. `readWebOffer()` runs on the server;
 * the client only ever receives the resolved, safe shape below.
 */
export type WebOffer = {
  /** RevenueCat product identifier — matches the App Store product it mirrors. */
  productId: string;
  /** What a learner is told they are buying. Never a price on its own. */
  planName: string;
  /** Optional, and absent unless configured. See the note above. */
  displayPrice: string | null;
  /** "month" | "year" — only rendered alongside a configured price. */
  period: string | null;
};

/** What the browser is allowed to know: whether a purchase can be started. */
export type WebOfferState =
  | { status: "unconfigured" }
  | { status: "ready"; offer: WebOffer };

/**
 * Read the offer from the server environment.
 *
 * `WEB_BILLING_PURCHASE_URL` is intentionally NOT part of the offer shape —
 * it never reaches the browser. The checkout route builds it server-side so
 * the `app_user_id` on it comes from the session cookie and cannot be chosen
 * by the caller.
 */
export function readWebOffer(env: NodeJS.ProcessEnv = process.env): WebOfferState {
  const productId = (env.WEB_BILLING_PRODUCT_ID ?? "").trim();
  const purchaseUrl = (env.WEB_BILLING_PURCHASE_URL ?? "").trim();
  // Both are required: a product with no purchase link cannot be bought, and
  // a link with no product is not something we can name to the learner.
  if (!productId || !purchaseUrl) return { status: "unconfigured" };

  const displayPrice = (env.WEB_BILLING_DISPLAY_PRICE ?? "").trim();
  const period = (env.WEB_BILLING_PERIOD ?? "").trim();
  return {
    status: "ready",
    offer: {
      productId,
      planName: (env.WEB_BILLING_PLAN_NAME ?? "SLP Command Pro").trim(),
      displayPrice: displayPrice || null,
      // A period without a price is meaningless to show, so it travels only
      // with one.
      period: displayPrice && period ? period : null,
    },
  };
}

/**
 * The hosted checkout URL for one authenticated learner.
 *
 * RevenueCat's Web Purchase Links take the App User ID as a query parameter.
 * Ours is the Supabase UUID — the same value iOS passes to
 * `Purchases.configure(appUserID:)` — so a purchase made here lands on the
 * same RevenueCat customer, and therefore the same `user_plans` row, as one
 * made in the app. No email matching, no account linking, no merge.
 *
 * `userId` must come from the server's own reading of the session cookie.
 * Accepting it from the client would let anyone attach a purchase to someone
 * else's account, which is the one unforgivable bug in a billing integration.
 */
export function buildCheckoutUrl(userId: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const base = (env.WEB_BILLING_PURCHASE_URL ?? "").trim();
  if (!base || !userId) return null;
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return null;
  }
  // Only ever https, and only ever to the configured host.
  if (url.protocol !== "https:") return null;
  url.searchParams.set("app_user_id", userId);
  return url.toString();
}
