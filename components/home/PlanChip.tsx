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
        <p className="muted">Subscriptions are managed in the iOS app.</p>
      ) : (
        <div className="home-pro-banner">
          <p className="muted">
            <strong>SLP Command Professional</strong> — unlimited practice, feedback and exams in the iOS app.
          </p>
        </div>
      )}
    </article>
  );
}
