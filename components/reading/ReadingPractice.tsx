"use client";

import { useCallback, useEffect, useState } from "react";
import { FrontendError } from "@/lib/api/client";
import type { ReadingPassage } from "@/lib/api/reading";
import {
  loadReadingPassage,
  rotateReadingPracticeKey,
  submitReadingAnswer,
} from "@/lib/reading/practiceSession";
import { CommercialCard, ExerciseShell, FeedbackBanner } from "@/components/exercise/ExerciseShell";
import { ErrorState, LoadingState } from "@/components/ui/ProductState";
import { OptionList } from "@/components/exercise/OptionList";

type Phase = "loading" | "ready" | "answered" | "quota" | "error";

export function ReadingPractice() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [passage, setPassage] = useState<ReadingPassage | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async (rotate: boolean) => {
    setPhase("loading");
    setSelected(null);
    setMessage("");
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
      setMessage("Couldn't load a text. You were not charged.");
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
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
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
      }
      if ((event.key === "k" || event.key === "ArrowLeft") && questionIndex > 0) {
        setQuestionIndex((n) => n - 1);
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function confirm() {
    if (!passage || !question || selected == null || phase !== "ready") return;
    setPhase("answered");
    try {
      await submitReadingAnswer({
        readingTextId: passage.readingTextId,
        questionId: question.questionId,
        selectedIndex: selected,
      });
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setPhase("quota");
        return;
      }
      setMessage(err instanceof FrontendError ? err.message : "Something went wrong. Your progress was not changed.");
    }
  }

  return (
    <ExerciseShell
      skill="Reading"
      mode="Practice"
      title="One passage, one question"
      layout="stage"
      showTitle={phase !== "ready" && phase !== "answered"}
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
              locked={phase === "answered"}
              correctIndex={phase === "answered" ? question.correctIndex : null}
              onSelect={setSelected}
            />
            {phase === "ready" ? (
              <button className="btn btn-primary" type="button" disabled={selected == null} onClick={() => void confirm()}>
                Check answer
              </button>
            ) : null}
            {phase === "answered" && selected != null ? (
              <FeedbackBanner
                correct={question.correctIndex != null && selected === question.correctIndex}
                explanation={question.explanation}
              />
            ) : null}
            {message && phase === "answered" ? <p className="muted">{message}</p> : null}
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
