"use client";

import { useCallback, useEffect, useState } from "react";
import { FrontendError } from "@/lib/api/client";
import { quotaReassurance } from "@/lib/api/errors";
import { decodeListeningAnswer, type ListeningItem } from "@/lib/api/listening";
import {
  loadListeningNext,
  rotateListeningPracticeKey,
  submitListeningAnswer,
} from "@/lib/listening/practiceSession";
import { AudioPlayer } from "@/components/exercise/AudioPlayer";
import { CommercialCard, ExerciseShell, FeedbackBanner } from "@/components/exercise/ExerciseShell";
import { ErrorState, LoadingState } from "@/components/ui/ProductState";
import { OptionList } from "@/components/exercise/OptionList";

type Phase = "loading" | "ready" | "submitting" | "answered" | "quota" | "error";

export function ListeningPractice({
  focusSkill,
  focusSubSkill,
}: {
  focusSkill?: string;
  focusSubSkill?: string;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [item, setItem] = useState<ListeningItem | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [explanation, setExplanation] = useState("");
  /** The server's verdict. null means "not graded", never "wrong". */
  const [verdict, setVerdict] = useState<boolean | null>(null);

  const load = useCallback(async (rotate: boolean) => {
    setPhase("loading");
    setSelected(null);
    setMessage("");
    setCorrectIndex(null);
    setExplanation("");
    setVerdict(null);
    if (rotate) rotateListeningPracticeKey();
    try {
      const next = await loadListeningNext({ focusSkill, focusSubSkill });
      setItem(next);
      setPhase("ready");
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setPhase("quota");
        return;
      }
      /**
       * The reassurance is conditional because the truth is. See
       * quotaReassurance: it speaks only when the backend answered 4xx, where
       * requireQuota's finish hook has provably refunded the unit; it stays
       * silent for a 5xx or a dropped connection, which is exactly where the
       * old unconditional "You were not charged." could be false.
       */
      setMessage(
        err instanceof FrontendError
          ? err.message
          : `Couldn’t load a clip. ${quotaReassurance(err)}`.trim(),
      );
      setPhase("error");
    }
  }, [focusSkill, focusSubSkill]);

  useEffect(() => {
    void load(false);
  }, [load]);

  async function confirm() {
    if (!item || selected == null || phase !== "ready") return;
    // Lock against a double-submit, but claim nothing about the answer until
    // the server has actually graded it. This used to be setPhase("answered")
    // BEFORE the await, so the banner rendered a verdict that did not exist —
    // and survived a failed submit, sitting above "your progress was not
    // changed".
    setPhase("submitting");
    setMessage("");
    try {
      const raw = await submitListeningAnswer({
        listeningId: item.listeningId,
        questionId: item.questionId,
        selectedIndex: selected,
      });
      const result = decodeListeningAnswer(raw);
      setVerdict(result.isCorrect);
      setCorrectIndex(result.correctIndex ?? item.correctIndex);
      setExplanation(result.explanation);
      setPhase("answered");
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setPhase("quota");
        return;
      }
      setVerdict(null);
      setMessage(err instanceof FrontendError ? err.message : "Something went wrong. Your answer was not recorded.");
      setPhase("ready");
    }
  }

  const marked = correctIndex ?? item?.correctIndex ?? null;

  return (
    <ExerciseShell
      skill="Listening"
      mode="Practice"
      title="One clip, one question"
      layout="stage"
      showTitle={phase !== "ready" && phase !== "answered" && phase !== "submitting"}
    >
      <p className="muted">No transcript — just like the real exam.</p>
      {phase === "quota" ? <CommercialCard /> : null}
      {phase === "error" ? <ErrorState message={message} onRetry={() => void load(true)} /> : null}
      {phase === "loading" ? <LoadingState label="Loading a clip…" lines={2} /> : null}
      {item && phase !== "quota" && phase !== "error" ? (
        <>
          <AudioPlayer src={item.audioUrl} allowSeek variant="stage" />
          <div className="listen-question">
            <h2>{item.prompt || "Choose the best answer."}</h2>
            <OptionList
              options={item.options}
              selected={selected}
              locked={phase === "answered" || phase === "submitting"}
              correctIndex={phase === "answered" ? marked : null}
              onSelect={setSelected}
            />
            {phase === "ready" ? (
              <button className="btn btn-primary" type="button" disabled={selected == null} onClick={() => void confirm()}>
                Check answer
              </button>
            ) : null}
            {phase === "submitting" ? (
              <p className="muted" role="status" aria-busy="true">
                Checking your answer…
              </p>
            ) : null}
            {/* The verdict is the SERVER's. `marked` positions the highlight;
                it is not evidence of correctness — a live /slp/next payload
                carries correctIndex: null, which is why deriving the verdict
                from it reported "Not quite" for every answer. */}
            {phase === "answered" && verdict != null ? (
              <FeedbackBanner correct={verdict} explanation={explanation} />
            ) : null}
            {phase === "answered" && verdict == null ? (
              <div className="feedback-banner" role="status">
                <strong>Answer recorded</strong>
                <p>Your attempt was saved, but this item came back without a verdict.</p>
              </div>
            ) : null}
            {message ? <p className="err" role="alert">{message}</p> : null}
            {phase === "answered" ? (
              <button className="btn btn-outline" type="button" onClick={() => void load(true)}>
                Next clip
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </ExerciseShell>
  );
}
