"use client";

import { useCallback, useEffect, useState } from "react";
import { FrontendError } from "@/lib/api/client";
import { quotaReassurance } from "@/lib/api/errors";
import type { ReadingAnswerResult, ReadingPassage } from "@/lib/api/reading";
import {
  loadReadingPassage,
  rotateReadingPracticeKey,
  submitReadingAnswer,
} from "@/lib/reading/practiceSession";
import { CommercialCard, ExerciseShell, FeedbackBanner } from "@/components/exercise/ExerciseShell";
import { ErrorState, LoadingState } from "@/components/ui/ProductState";
import { OptionList } from "@/components/exercise/OptionList";

/**
 * `submitting` is a real phase, not cosmetic.
 *
 * The screen used to call setPhase("answered") BEFORE awaiting the POST, so
 * the feedback banner rendered against a verdict the server had not given
 * yet — and stayed rendered when the POST failed, showing "Correct"/"Not
 * quite" directly above "Something went wrong. Your progress was not
 * changed." The learner was told simultaneously that they had been graded and
 * that nothing had been recorded, with the passage locked and an answer
 * revealed for an attempt that did not exist server-side.
 */
type Phase = "loading" | "ready" | "submitting" | "answered" | "quota" | "error";

export function ReadingPractice() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [passage, setPassage] = useState<ReadingPassage | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [verdict, setVerdict] = useState<ReadingAnswerResult | null>(null);

  const load = useCallback(async (rotate: boolean) => {
    setPhase("loading");
    setSelected(null);
    setMessage("");
    setVerdict(null);
    setQuestionIndex(0);
    if (rotate) rotateReadingPracticeKey();
    try {
      const next = await loadReadingPassage();
      setPassage(next);
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
      setMessage(`Couldn’t load a text. ${quotaReassurance(err)}`.trim());
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const question = passage?.questions[questionIndex] ?? null;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!question || phase === "loading") return;
      /**
       * Never take a key away from whatever the learner is actually using.
       *
       * This guarded INPUT/TEXTAREA/SELECT only, so Enter and Space were still
       * hijacked while focus sat on a BUTTON — including "Check answer" and
       * "Next passage". Pressing Space on a focused button did not activate it;
       * it ran this handler instead, which is a keyboard trap in the plainest
       * sense: the control has focus and does not respond to its own key.
       * Buttons, links, contenteditable regions and anything inside an open
       * dialog now keep their native behaviour.
       */
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a[href], [contenteditable=''], [contenteditable='true'], [role='dialog']")) {
        return;
      }
      if (event.key >= "1" && event.key <= "4") {
        const index = Number(event.key) - 1;
        if (index < question.options.length && phase === "ready") setSelected(index);
      }
      if ((event.key === "Enter" || event.key === " ") && phase === "ready" && selected != null) {
        event.preventDefault();
        void confirm();
      }
      if ((event.key === "j" || event.key === "ArrowRight") && passage && questionIndex < passage.questions.length - 1) {
        setQuestionIndex((n) => n + 1);
        setSelected(null);
        setVerdict(null);
        setPhase("ready");
      }
      if ((event.key === "k" || event.key === "ArrowLeft") && questionIndex > 0) {
        setQuestionIndex((n) => n - 1);
        setSelected(null);
        setVerdict(null);
        setPhase("ready");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function confirm() {
    if (!passage || !question || selected == null || phase !== "ready") return;
    // Lock the options immediately so a second press cannot double-submit,
    // but do NOT claim the answer is graded until the server says so.
    setPhase("submitting");
    setMessage("");
    try {
      const result = await submitReadingAnswer({
        readingTextId: passage.readingTextId,
        questionId: question.questionId,
        selectedIndex: selected,
      });
      setVerdict(result);
      setPhase("answered");
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setPhase("quota");
        return;
      }
      // The attempt did not reach the server. Go back to a state the learner
      // can act on — options unlocked, selection kept, nothing asserted about
      // whether they were right — instead of showing a verdict beside a
      // message saying nothing was recorded.
      setVerdict(null);
      setMessage(err instanceof FrontendError ? err.message : "Something went wrong. Your answer was not recorded.");
      setPhase("ready");
    }
  }

  return (
    <ExerciseShell
      skill="Reading"
      mode="Practice"
      title="One passage, one question"
      layout="stage"
      showTitle={phase !== "ready" && phase !== "answered" && phase !== "submitting"}
    >
      {phase === "quota" ? <CommercialCard /> : null}
      {phase === "error" ? <ErrorState message={message} onRetry={() => void load(true)} /> : null}
      {phase === "loading" ? (
        <div className="doc-stage">
          <div className="doc-paper">
            <LoadingState label="Loading a text…" lines={4} />
          </div>
        </div>
      ) : null}

      {passage && question && phase !== "quota" ? (
        <div className="doc-stage">
          <article className="doc-paper">
            <div className="home-block-head">
              {passage.genreDescriptor ? <span className="home-chip">{passage.genreDescriptor}</span> : null}
              {passage.difficulty ? <span className="home-chip">Text difficulty: {passage.difficulty}</span> : null}
            </div>
            {passage.title ? <h2 className="doc-title">{passage.title}</h2> : null}
            <div className="passage-body">{passage.text}</div>
            <p className="muted">Text difficulty is the pool band, not your estimated SLP.</p>
          </article>

          <aside className="doc-rail">
            <p className="home-kicker">
              Question {questionIndex + 1} of {passage.questions.length}
            </p>
            <h2>{question.prompt}</h2>
            <OptionList
              options={question.options}
              selected={selected}
              locked={phase === "answered" || phase === "submitting"}
              /* The correct cell is whatever the SERVER named, in the shuffled
                 display order it sent back. The passage never carries a key. */
              correctIndex={phase === "answered" ? (verdict?.correctIndex ?? null) : null}
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
            {phase === "answered" && verdict?.isCorrect != null ? (
              <FeedbackBanner
                correct={verdict.isCorrect}
                explanation={verdict.explanation || question.explanation}
              />
            ) : null}
            {/* The server accepted the attempt but returned no verdict. Say
                exactly that — "Not quite" would be an invention. */}
            {phase === "answered" && verdict?.isCorrect == null ? (
              <div className="feedback-banner" role="status">
                <strong>Answer recorded</strong>
                <p>Your attempt was saved, but this item came back without a verdict.</p>
              </div>
            ) : null}
            {verdict?.evidenceQuote && phase === "answered" ? (
              <blockquote className="doc-evidence">{verdict.evidenceQuote}</blockquote>
            ) : null}
            {message ? <p className="err" role="alert">{message}</p> : null}
            {phase === "answered" ? (
              <button className="btn btn-outline" type="button" onClick={() => void load(true)}>
                Next passage
              </button>
            ) : null}
          </aside>
        </div>
      ) : null}
    </ExerciseShell>
  );
}
