import { readWebOffer } from "@/lib/plan/offer";
import { loadEntitlements, loadFeatureFlags } from "@/lib/server/home";
import { SubscriptionView } from "@/components/plan/SubscriptionView";

/**
 * The commercial surface.
 *
 * `/subscription` was already reserved — `app/robots.ts` has disallowed it
 * since PR-15 — but nothing was ever mounted there, so every "plan boundary"
 * in the product pointed at a usage meter inside Settings instead. This is the
 * one screen that answers "what am I on, what would Pro change, and how do I
 * get it", and it is deliberately **not operative**: there is no checkout here,
 * because the provider is Q4 and Q4 is unanswered.
 *
 * What it does have is real: the plan and allowances come from
 * `GET /api/entitlements`, and the way to subscribe today is the iOS app, which
 * is the truth until a web rail exists.
 */
export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const [entitlements, flags] = await Promise.all([loadEntitlements(), loadFeatureFlags()]);
  // The offer is read on the server and only its safe shape crosses to the
  // browser — the purchase URL never does, because the checkout route builds
  // it from the session so the App User ID on it cannot be chosen by a caller.
  const offer = readWebOffer();
  return (
    <SubscriptionView initial={entitlements} offer={offer} billingEnabled={flags.web_billing_enabled} />
  );
}
