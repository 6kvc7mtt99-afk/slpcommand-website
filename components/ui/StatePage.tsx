import { ProductState } from "@/components/ui/ProductState";
import type { ResolvedState } from "@/lib/server/stateFromResult";

/**
 * A whole route that could not render its content, in the shared vocabulary.
 *
 * THE BUG THIS FIXES. `lib/server/stateFromResult.ts` was written to make the
 * server half of the product speak the same language as the client half — and
 * then had ZERO call sites. Every loader kept its own hand-written sentence,
 * and those sentences did not distinguish the four things that can go wrong:
 *
 *   `That lesson is not in the curriculum.`   — rendered for a 403, a 404, a
 *   500, and the synthetic 504 that means the backend never answered. Three of
 *   those four are an outage or a plan boundary, and the product was telling
 *   the learner that the CONTENT does not exist. That is a false statement
 *   about the catalog, produced by a network failure.
 *
 * This is the renderer for the mapper's output, so a route's failure branch is
 * one line and cannot drift back into inventing a cause.
 */
export function StatePage({
  state,
  title,
  backHref,
  backLabel,
}: {
  state: ResolvedState;
  /** The section eyebrow — where the learner is, not what went wrong. */
  title: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <section className="exercise">
      <ProductState
        kind={state.kind}
        scope="page"
        title={title}
        body={state.body}
        detail={state.detail}
        lockReason={state.lockReason}
        /**
         * The primary action is whatever RESOLVES the state. On a plan
         * boundary that is the plan, not the way back — ProductState styles the
         * first action as primary, so ordering is the whole decision here.
         */
        actions={
          state.kind === "locked"
            ? [
                { kind: "link", label: "See your plan", href: "/subscription" },
                ...(backHref ? [{ kind: "link" as const, label: backLabel ?? "Back", href: backHref }] : []),
              ]
            : backHref
              ? [{ kind: "link", label: backLabel ?? "Back", href: backHref }]
              : undefined
        }
      />
    </section>
  );
}
