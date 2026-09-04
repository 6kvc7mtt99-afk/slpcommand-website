import type { LockReason, StateKind } from "@/components/ui/ProductState";

/**
 * The server half of the state system.
 *
 * A single component cannot make failure coherent, because half the failure
 * sites in this product are SERVER components that have never seen the client
 * error taxonomy in lib/api/errors.ts. They each read a raw `status` and wrote
 * their own sentence — which is why a 403 on the Academy said "unavailable
 * right now" (an outage) while the same 403 on Intelligence said something
 * else, and a 404 on a lesson used the same component as a 500.
 *
 * This maps a `backendJson` result onto the same vocabulary the client uses,
 * so both halves agree:
 *
 *   403           → locked / notOnPlan   the plan does not include this
 *   404           → empty                asked for something that is not there
 *   >= 500, 504   → error                we could not ask
 *   2xx + empty   → empty                asked, and there is nothing yet
 *   otherwise     → null                 render the real thing
 *
 * The distinction that matters most is the last one in the error branch: a
 * transport failure is "we could not ask", never "you do not have it". The
 * synthetic 504 that lib/server/backend.ts returns for an unreachable backend
 * lands here as `error`, so an outage can never be rendered as a fact about
 * the learner's account.
 */
export type ResolvedState = {
  kind: StateKind;
  body: string;
  detail?: string;
  lockReason?: LockReason;
};

export function stateFromResult(
  result: { status: number },
  ctx: {
    /** What was being fetched, as a noun phrase: "the Academy", "your history". */
    subject: string;
    /** True when a 2xx decoded to nothing — asked, and there is nothing yet. */
    emptyWhen?: boolean;
    /**
     * True when a 2xx arrived but could not be decoded into the shape this
     * screen needs. That is a CONTRACT failure on our side of the wire, and it
     * is neither "empty" nor "not found" — the distinction matters because the
     * academy routes used to report exactly this case, and every transport
     * failure with it, as "that lesson is not in the curriculum".
     */
    unreadableWhen?: boolean;
  },
): ResolvedState | null {
  const { status } = result;

  if (status === 403) {
    return {
      kind: "locked",
      body: `${capitalise(ctx.subject)} is not included in your current plan.`,
      detail: "Open your plan to see what changes.",
      lockReason: "notOnPlan",
    };
  }

  if (status === 404) {
    return {
      kind: "empty",
      body: `${capitalise(ctx.subject)} could not be found.`,
      detail: "It may have moved, or the link may be out of date.",
    };
  }

  if (status >= 500) {
    return {
      kind: "error",
      // "Could not be read" — not "is unavailable", which reads as a statement
      // about the thing rather than about our ability to fetch it.
      body: `${capitalise(ctx.subject)} could not be loaded just now.`,
      detail: "Nothing about your record has changed. Try again in a moment.",
    };
  }

  if (status >= 400) {
    return {
      kind: "error",
      body: `${capitalise(ctx.subject)} could not be loaded.`,
      detail: "Nothing about your record has changed.",
    };
  }

  if (ctx.unreadableWhen) {
    return {
      kind: "error",
      body: `${capitalise(ctx.subject)} could not be read.`,
      detail: "The server replied, but not with something this screen could use. Nothing about your record has changed.",
    };
  }

  if (ctx.emptyWhen) {
    return {
      kind: "empty",
      body: `Nothing in ${ctx.subject} yet.`,
      detail: "This fills in as you train.",
    };
  }

  return null;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
