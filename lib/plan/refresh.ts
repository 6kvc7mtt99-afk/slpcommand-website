import { interpretEntitlements, isEntitledToPro, type EntitlementsState } from "@/lib/entitlements";

/**
 * THE BOUNDED RE-READ — "never grant locally", made operational.
 *
 * A purchase does not reach `user_plans` the instant it is made: it reaches it
 * when the provider's signed webhook does, which lags by anything from a
 * moment to a few seconds. The wrong answer to that lag is to believe the
 * client — flip a local flag on "purchase succeeded" and let the UI unlock.
 * That is precisely the client-side unlock PR-21 forbids.
 *
 * The right answer, and the one the master plan names as a launch gate
 * ("Never-grant-locally proven (`refreshUntilPro` analogue)"), is to ask the
 * BACKEND again, a bounded number of times, and report exactly what it said.
 * If the backend never says Pro, this returns not-Pro. There is no branch in
 * which optimism wins.
 *
 * Provider-independent by construction: it re-reads `GET /api/entitlements`,
 * which is already the only thing the product treats as authority. Whether the
 * purchase happened in the iOS app (true today) or through a future web rail
 * (Q4) changes nothing here.
 *
 * The schedule is the shipped iOS one (`EntitlementsService.defaultDelaysNanos`),
 * kept identical so both clients feel the same after a purchase: five reads,
 * front-loaded — the webhook usually lands in well under a second, and a flat
 * cadence made the fast path feel broken.
 */
export const RECHECK_DELAYS_MS = [300, 500, 800, 1100, 1100] as const;

export type RecheckOutcome = {
  /** The backend's own verdict at the end of the budget. Never optimistic. */
  isPro: boolean;
  state: EntitlementsState;
  /** How many reads it actually took. For copy like "checked 5 times". */
  attempts: number;
};

/**
 * Re-read entitlements until the backend reports Pro, or the budget runs out.
 *
 * `read` and `sleep` are injected so the whole thing is testable without a
 * network or a clock — the property that matters (a client cannot talk itself
 * into Pro) should not need a browser to prove.
 */
export async function recheckEntitlements(opts: {
  read: () => Promise<{ status: number; body: unknown }>;
  delaysMs?: readonly number[];
  sleep?: (ms: number) => Promise<void>;
}): Promise<RecheckOutcome> {
  const delays = opts.delaysMs ?? RECHECK_DELAYS_MS;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  let state: EntitlementsState = { status: "error" };
  let attempts = 0;

  for (let i = 0; i < delays.length; i += 1) {
    attempts += 1;
    try {
      const { status, body } = await opts.read();
      state = interpretEntitlements(status, (body ?? null) as never);
    } catch {
      // A failed read is not a verdict. Keep the last real one and try again;
      // if every read fails, the loop ends on `error`, which grants nothing.
      state = state.status === "ready" ? state : { status: "error" };
    }
    if (isEntitledToPro(state)) return { isPro: true, state, attempts };
    // The final delay is never slept: the loop is over, and making someone
    // wait after the last answer buys nothing.
    if (i < delays.length - 1) await sleep(delays[i]!);
  }

  return { isPro: isEntitledToPro(state), state, attempts };
}

/** The browser's read of the authority. One path, same-origin, cookie-authed. */
export async function readEntitlements(): Promise<{ status: number; body: unknown }> {
  const res = await fetch("/api/backend/entitlements", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json", "X-SLP-Client": "web" },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}
