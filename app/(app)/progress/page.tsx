import { ConfidenceScaleCard, EstimatedSlpHero, TransitionBanner } from "@/components/home/EstimatedSlpHero";
import { loadProgress } from "@/lib/server/home";

export default async function ProgressPage() {
  const progress = await loadProgress();

  return (
    <section className="exercise">
      <p className="section-eyebrow">Progress</p>
      <h1>Estimated SLP</h1>
      <p className="muted">
        Levels come from GET /api/progress. Nothing here is derived in the browser. Confidence labels:
        Reliable, Fairly reliable, Limited evidence, Out of date.
      </p>
      <TransitionBanner progress={progress} />
      <EstimatedSlpHero progress={progress} />
      <ConfidenceScaleCard progress={progress} />
      {!progress ? <p className="muted">Estimated SLP is unavailable right now. The rest of the workspace still works.</p> : null}
    </section>
  );
}
