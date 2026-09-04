import { ProductState } from "@/components/ui/ProductState";
/**
 * What remains of the Phase-2 intelligence panels.
 *
 * `ReadinessCardView`, `MissionsSection` and `WeaknessSection` were removed:
 * a repo-wide grep found zero references to any of them outside their own
 * definitions. Every live Intelligence surface renders through
 * `components/intelligence/Briefing.tsx` instead. Their two private helpers —
 * `readinessPercent` and `percentFromAccuracy` — went with them, having no
 * remaining callers; accuracy normalisation now happens once, in the decoder
 * (`accuracyPercent` in lib/api/intelligence.ts), which is where it belongs.
 *
 * `IntelligenceError` below is still live — the two per-skill Intelligence
 * routes and the Listening mastery route all render it.
 */

/**
 * An Intelligence route that could not load.
 *
 * This was an `article.home-card` with a kicker — a third visual identity for
 * "this failed", alongside the Academy's bare heading and the practice
 * screens' red one-liner. Same product, same event, three appearances, and
 * none of them offered a way out. It now renders through ProductState's page
 * scope like every other whole-route failure, and takes a route back.
 */
export function IntelligenceError({
  message,
  backHref,
  backLabel,
}: {
  message: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <ProductState
      kind="error"
      scope="page"
      title="Intelligence"
      body={message}
      detail="Nothing about your record has changed. Try again in a moment."
      actions={backHref ? [{ kind: "link", label: backLabel ?? "Back", href: backHref }] : undefined}
    />
  );
}
