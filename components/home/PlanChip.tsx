import { planLabel, type EntitlementsState } from "@/lib/entitlements";

export function PlanChip({ entitlements }: { entitlements: EntitlementsState }) {
  const label = planLabel(entitlements);
  const isPro = entitlements.status === "ready" && entitlements.isPro;

  return (
    <article className="home-card home-plan">
      <p className="home-kicker">Current plan</p>
      <p>
        <strong>{label}</strong>
      </p>
      {isPro ? (
        <p className="muted">Upgrade any time from your plan page.</p>
      ) : (
        <div className="home-pro-banner">
          <p className="muted">
            <strong>SLP Command Professional</strong> — unlimited practice, AI feedback and exam simulations.
          </p>
        </div>
      )}
    </article>
  );
}
