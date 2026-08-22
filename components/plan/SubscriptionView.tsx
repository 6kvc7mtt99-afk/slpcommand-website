"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePlan } from "@/components/app/PlanProvider";
import { featureAccess, type EntitlementsState } from "@/lib/entitlements";
import type { WebOfferState } from "@/lib/plan/offer";

/**
 * What you are on, what Pro would change, and how to get it — nothing invented.
 *
 * Three rules this screen holds to:
 *
 *  1. **No fake checkout.** Until Q4 names a provider there is no purchase rail
 *     on the web, and pretending otherwise — a disabled "Subscribe" button, a
 *     price with no way to pay it — would be worse than saying so plainly.
 *  2. **The numbers are the account's own.** Allowances come from the
 *     entitlements response, per feature, with the real period. Nothing here is
 *     a marketing figure typed into a component.
 *  3. **The client never decides.** "Check again" re-reads the backend up to
 *     five times and shows whatever it says, including "still Free".
 */

/** The features the plan meters, in the order a learner meets them. */
const METERED: Array<{ key: string; label: string; free: string }> = [
  { key: "reading_practice", label: "Reading practice", free: "Weekly allowance" },
  { key: "listening_practice", label: "Listening practice", free: "Weekly allowance" },
  { key: "writing_ai_feedback", label: "Writing AI feedback", free: "Monthly allowance" },
  { key: "speaking_ai_feedback", label: "Speaking AI feedback", free: "Monthly allowance" },
  { key: "reading_exam_simulation", label: "Reading exam simulation", free: "Monthly allowance" },
  { key: "listening_exam_simulation", label: "Listening exam simulation", free: "Monthly allowance" },
];

/** Declared on the plan rather than metered — shown as included or not. */
const INCLUDED: Array<{ key: string; label: string }> = [
  { key: "academy_access", label: "Academy" },
  { key: "intelligence_dashboard", label: "Intelligence dashboards" },
  { key: "mastery_trends", label: "Mastery trends" },
  { key: "adaptive_coach", label: "Adaptive Coach" },
];

function allowanceLine(state: EntitlementsState, key: string): string | null {
  const access = featureAccess(state, key);
  if (access.limit == null) return null;
  const period = access.period === "weekly" ? "per week" : access.period === "monthly" ? "per month" : "";
  if (access.remaining == null) return `${access.limit} ${period}`.trim();
  return `${access.remaining} of ${access.limit} left${period ? ` ${period.replace("per ", "this ")}` : ""}`;
}

/**
 * Where a purchase stands, from this browser's point of view.
 *
 * `returned` matters more than it looks. Coming back from the hosted checkout
 * is NOT proof of payment — there is no signed receipt in that redirect, and
 * treating it as success is the optimistic unlock this whole architecture
 * exists to prevent. It only means "a purchase may have just happened, go and
 * ask the server". The server's answer is the only thing that changes the
 * plan.
 */
type CheckoutPhase =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "failed" }
  | { kind: "confirming" }
  | { kind: "confirmed" }
  | { kind: "pending" }
  | { kind: "unchanged" };

export function SubscriptionView({
  initial,
  offer,
  billingEnabled,
}: {
  initial: EntitlementsState;
  offer: WebOfferState;
  billingEnabled: boolean;
}) {
  const { state, display, isPro, rechecking, recheck } = usePlan(initial);
  const [phase, setPhase] = useState<CheckoutPhase>({ kind: "idle" });
  // While a payment is being confirmed the purchase button must go away.
  // Someone returning from checkout lands at the top of this page, sees the
  // plan still reading "Free", and — if the Subscribe button is still sitting
  // there — can reasonably conclude the payment failed and pay a second time.
  const awaitingReceipt = phase.kind === "confirming" || phase.kind === "pending";
  const canBuy = billingEnabled && offer.status === "ready" && !isPro && !awaitingReceipt;

  const view = state;

  /**
   * Ask the server, and report exactly what it said.
   *
   * `recheck()` is PR-21's bounded re-read: five reads on the schedule the iOS
   * client already uses (300/500/800/1100/1100 ms), returning the backend's
   * verdict and never an optimistic one. It is reused unchanged here because
   * the problem is identical — a receipt has to reach the backend before the
   * plan can change, and that takes a moment.
   */
  const confirmWithServer = useCallback(
    async (after: "return" | "manual") => {
      setPhase({ kind: "confirming" });
      const confirmed = await recheck();
      // The distinction the learner needs: "we asked and you are Pro",
      // versus "we asked, you are not Pro yet, and if you have just paid that
      // is normal", versus "we asked and nothing has changed".
      setPhase({ kind: confirmed ? "confirmed" : after === "return" ? "pending" : "unchanged" });
    },
    [recheck],
  );

  // Returning from the hosted checkout. The flag is a hint that a purchase may
  // have happened, nothing more — it is stripped from the URL immediately so a
  // reload or a shared link cannot replay the "just purchased" state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "return") return;
    params.delete("checkout");
    const query = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (query ? `?${query}` : ""));
    void confirmWithServer("return");
  }, [confirmWithServer]);

  async function startCheckout() {
    setPhase({ kind: "starting" });
    const ask = () =>
      fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      });
    try {
      let res = await ask();
      // The route refuses to build a payment link from a token the backend
      // has not just accepted, so an expired access token lands here as a 401
      // rather than as a checkout for the wrong person. Refresh once and ask
      // again — the same single-flight pattern every other call uses.
      if (res.status === 401) {
        const refreshed = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
        });
        if (refreshed.ok) res = await ask();
      }
      if (!res.ok) {
        setPhase({ kind: "failed" });
        return;
      }
      const { url } = (await res.json()) as { url?: string };
      if (!url) {
        setPhase({ kind: "failed" });
        return;
      }
      window.location.assign(url);
    } catch {
      setPhase({ kind: "failed" });
    }
  }

  return (
    <section className="plan-page">
      <header className="plan-masthead" data-enter>
        <p className="p-eyebrow">Your plan</p>
        <h1 className="p-hero-title">{display.label}</h1>
        {display.known ? (
          <p className="p-lead">
            {isPro
              ? "Everything in SLP Command is open on this account. Your subscription is managed where you bought it."
              : "Free covers the whole method with weekly and monthly allowances. Professional removes the allowances."}
          </p>
        ) : (
          <p className="p-lead">
            We could not read your plan just now. Nothing has changed about what you are billed — this screen simply
            does not know what to show yet.
          </p>
        )}

        {/* Stated next to the plan, because that is the line someone
            returning from checkout reads first — and the line that would
            otherwise look like the payment had failed. */}
        {awaitingReceipt ? (
          <p className="plan-banner" role="status" aria-live="polite">
            {phase.kind === "confirming"
              ? "Checking with the server for your subscription…"
              : "Payment lands on this account when the receipt arrives — not when this browser comes back. Don’t pay again."}
          </p>
        ) : null}
      </header>

      <section className="p-section" data-reveal aria-label="What your plan allows">
        <div className="p-section-head">
          <div>
            <h2>What your plan allows</h2>
            <p>Straight from your account, not a price list.</p>
          </div>
        </div>

        {view.status === "ready" ? (
          <ul className="plan-allowances">
            {METERED.map((item) => {
              const access = featureAccess(view, item.key);
              const line = allowanceLine(view, item.key);
              return (
                <li key={item.key} className="plan-allowance">
                  <span className="plan-allowance-name">{item.label}</span>
                  {/* Red is reserved for a wall you have actually hit. A
                      feature that was never in this plan is a fact, not a
                      failure, and colouring it like an error reads as
                      something being broken. */}
                  <span className={`plan-allowance-val${access.reason === "spent" ? " is-out" : ""}`}>
                    {isPro && line == null ? "Unlimited" : (line ?? (access.usable ? "Included" : "Not on this plan"))}
                  </span>
                </li>
              );
            })}
            {INCLUDED.map((item) => {
              const access = featureAccess(view, item.key);
              return (
                <li key={item.key} className="plan-allowance">
                  <span className="plan-allowance-name">{item.label}</span>
                  <span className={`plan-allowance-val${access.usable ? "" : " is-absent"}`}>
                    {access.usable ? "Included" : "Not on this plan"}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">
            Your allowances are not readable right now. Where an action is unavailable, the screen that offers it says
            so at the point of use.
          </p>
        )}
      </section>

      {!isPro && !awaitingReceipt ? (
        <section className="p-section" data-reveal aria-label="How to subscribe">
          <div className="p-section-head">
            <div>
              <h2>Getting Professional</h2>
              <p>
                {canBuy
                  ? "Subscribe here. Payment lands on this account when the receipt arrives — not when this browser comes back."
                  : "Web checkout is off on this account. Email support@slpcommand.com."}
              </p>
            </div>
          </div>

          <article className="plan-lock">
            <span className="plan-lock-mark" aria-hidden="true" />
            {canBuy && offer.status === "ready" ? (
              <>
                <p className="plan-lock-kicker">Subscribe on the web</p>
                <h2>Professional</h2>
                <p className="plan-lock-body">
                  Payment is handled securely. You will come back here afterwards, and your plan updates once your
                  receipt reaches your account.
                </p>
                <div className="cta-row">
                  <button
                    className="btn btn-primary btn-command"
                    type="button"
                    onClick={() => void startCheckout()}
                    disabled={phase.kind === "starting"}
                  >
                    {phase.kind === "starting" ? "Opening secure checkout…" : "Get Professional · €9.99/month"}
                  </button>
                </div>
                {phase.kind === "failed" ? (
                  <p className="plan-recheck is-bad" role="alert">
                    Checkout did not open. Nothing was charged. Try again.
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="plan-lock-kicker">Web checkout</p>
                <h2>Web checkout is off on this account</h2>
                <p className="plan-lock-body">
                  Email support@slpcommand.com.
                </p>
              </>
            )}
          </article>
        </section>
      ) : null}

      <section className="p-section" data-reveal aria-label="Already subscribed">
        <div className="p-section-head">
          <div>
            <h2>Already subscribed?</h2>
            <p>A purchase reaches this account when its receipt does, which can lag a moment.</p>
          </div>
        </div>
        <div className="cta-row">
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => void confirmWithServer("manual")}
            disabled={rechecking}
          >
            {rechecking ? "Checking with the server…" : "Check my plan again"}
          </button>
        </div>

        {phase.kind === "confirmed" ? (
          <p className="plan-recheck is-ok" role="status" aria-live="polite">
            Confirmed — this account is on SLP Command Pro.
          </p>
        ) : null}

        {/* `confirming` and `pending` are stated once, in the banner beside
            the plan — that is where someone returning from checkout looks,
            and saying it twice on one screen reads as two different problems. */}
        {phase.kind === "pending" ? (
          <p className="plan-recheck is-pending" role="status">
            Payment lands when the receipt hits this account, not on browser return. Checking again is safe.
          </p>
        ) : null}

        {phase.kind === "unchanged" ? (
          <p className="plan-recheck" role="status" aria-live="polite">
            The server still reports this account as {display.label}. If you have just subscribed, give it a moment and
            check again — nothing is unlocked from this browser, so the answer always comes from your account.
          </p>
        ) : null}
      </section>

      <p className="plan-foot">
        <Link href="/profile#plan">See usage in Settings</Link>
        {" · "}
        <Link href="/terms">Terms</Link>
        {" · "}
        <Link href="/privacy">Privacy</Link>
      </p>
    </section>
  );
}
