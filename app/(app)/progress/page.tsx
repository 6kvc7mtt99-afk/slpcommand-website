import { ConfidenceScaleCard, EstimatedSlpHero, TransitionBanner } from "@/components/home/EstimatedSlpHero";
import { loadProgress } from "@/lib/server/home";

export default async function ProgressPage() {
  const progress = await loadProgress();

  return (
    <section className="exercise instrument">
      <header className="page-head">
        <p className="section-eyebrow">Progress</p>
        <p className="progress-figure" aria-hidden={progress ? undefined : true}>
          {progress ? `SLP ${progress.overall.level ?? "—"}` : "Estimated SLP"}
        </p>
        <h1 className="visually-hidden">Estimated SLP</h1>
        {/*
          This line used to read "Levels come from GET /api/progress. Nothing here
          is derived in the browser." That is a note to an engineer, not to a
          candidate, and it shipped on the page a learner opens to find out where
          they stand. The guarantee it was trying to make — that the number is
          measured, never invented — is worth keeping; the endpoint name is not.
        */}
        <p className="muted">
          Every level here is measured from work you actually submitted — nothing is
          estimated to fill a gap. Where the evidence is thin, the confidence label
          says so: Reliable, Fairly reliable, Limited evidence, or Out of date.
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
