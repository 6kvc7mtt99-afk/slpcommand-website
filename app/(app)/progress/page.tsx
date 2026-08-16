import { ConfidenceScaleCard, EstimatedSlpHero, TransitionBanner } from "@/components/home/EstimatedSlpHero";
import { loadProgress } from "@/lib/server/home";

export default async function ProgressPage() {
  const progress = await loadProgress();

  return (
    <section className="exercise instrument">
      <header className="page-head">
        <p className="section-eyebrow">Progress</p>
        <h1>Estimated SLP</h1>
        <p className="muted">
          Levels come from GET /api/progress. Nothing here is derived in the browser. Confidence labels:
          Reliable, Fairly reliable, Limited evidence, Out of date.
        </p>
      </header>
      <TransitionBanner progress={progress} />
      <div className="intel-layout">
        <EstimatedSlpHero progress={progress} />
        <ConfidenceScaleCard progress={progress} />
      </div>
      {!progress ? (
        <p className="muted">Estimated SLP is unavailable right now. The rest of the workspace still works.</p>
      ) : null}
    </section>
  );
}
