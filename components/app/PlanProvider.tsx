"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  planDisplay,
  isEntitledToPro,
  type EntitlementsState,
  type PlanDisplay,
} from "@/lib/entitlements";
import { recheckEntitlements, readEntitlements } from "@/lib/plan/refresh";

/**
 * ONE commercial state for the whole authenticated product.
 *
 * THE BUG THIS FIXES. The sidebar's plan label was rendered once, from the
 * layout's server read, and never looked again. Settings fetched entitlements
 * separately. So a learner who subscribed in the iOS app and came back to an
 * open web tab saw "SLP Command Free" in the sidebar and "SLP Command Pro" in
 * Settings at the same time — the product contradicting itself about the one
 * thing a paying customer cares about, with no way to resolve it but a hard
 * reload. Every commercial surface now reads this context, and there is one
 * answer on screen at a time.
 *
 * WHAT THIS IS NOT. It is not authority. It is a cache of what the server last
 * said, and the only way to change it is to ask the server again — `recheck()`
 * publishes whatever comes back, including "still Free". There is deliberately
 * no setter, no optimistic flip and no "grant" of any kind: a value edited in
 * DevTools changes a label and nothing else, because premium content is
 * withheld by the server component that renders it and by `requireFeature` /
 * `consume_quota` on the backend that serves it.
 */
export type PlanContextValue = {
  state: EntitlementsState;
  display: PlanDisplay;
  isPro: boolean;
  /** True while a bounded re-read is in flight. */
  rechecking: boolean;
  /**
   * Ask the backend again, up to five times, and publish its answer.
   * Resolves to whether the BACKEND confirmed Pro — never to a local guess.
   */
  recheck: () => Promise<boolean>;
};

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({
  initial,
  children,
}: {
  initial: EntitlementsState;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<EntitlementsState>(initial);
  const [rechecking, setRechecking] = useState(false);

  const recheck = useCallback(async () => {
    if (rechecking) return isEntitledToPro(state);
    setRechecking(true);
    try {
      const outcome = await recheckEntitlements({ read: readEntitlements });
      setState(outcome.state);
      return outcome.isPro;
    } finally {
      setRechecking(false);
    }
  }, [rechecking, state]);

  const value = useMemo<PlanContextValue>(
    () => ({
      state,
      display: planDisplay(state),
      isPro: isEntitledToPro(state),
      rechecking,
      recheck,
    }),
    [state, rechecking, recheck],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

/**
 * Read the shared commercial state.
 *
 * Outside the provider this degrades instead of throwing, because a component
 * can legitimately be rendered on its own — in a test, or on a surface that has
 * no app shell. `fallback` is for callers that already hold a server-rendered
 * snapshot of their own: that snapshot is a real answer from the authority, so
 * falling back to it is honest, where defaulting to "loading" would make a
 * component that knows the plan claim it does not.
 *
 * Either way there is nothing to grant: the fallback is a server value the
 * caller was handed, not something the browser can mint.
 */
export function usePlan(fallback?: EntitlementsState): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (ctx) return ctx;
  const state: EntitlementsState = fallback ?? { status: "loading" };
  return {
    state,
    display: planDisplay(state),
    isPro: isEntitledToPro(state),
    rechecking: false,
    recheck: async () => isEntitledToPro(state),
  };
}
