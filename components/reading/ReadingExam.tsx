"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FrontendError } from "@/lib/api/client";
import { quotaReassurance } from "@/lib/api/errors";
import { unansweredIndex, type ReadingExamAnswer, type ReadingExamStart } from "@/lib/api/readingExam";
import {
  clearReadingExamIntent,
  finishReadingExam,
  startReadingExam,
} from "@/lib/reading/examSession";
import { CommercialCard, ExerciseShell } from "@/components/exercise/ExerciseShell";
import { ExamDisclaimerGate } from "@/components/exercise/ExamDisclaimerGate";
import { ExamTimer } from "@/components/exercise/ExamTimer";
import { OptionList } from "@/components/exercise/OptionList";
import { ExamResultCard } from "@/components/exercise/ExamResultCard";
import { decodeExamResult, type ExamResult } from "@/lib/api/examResult";

type Phase = "gate" | "starting" | "live" | "finishing" | "done" | "quota" | "error";

export function ReadingExam() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("gate");
  const [userId, setUserId] = useState<string | null>(null);
  const [exam, setExam] = useState<ReadingExamStart | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ExamResult | null>(null);

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((data: { userId?: string }) => setUserId(data.userId ?? "anon"));
  }, []);

  const answersRef = useRef(answers);
  answersRef.current = answers;

  const finish = useCallback(async (payload: ReadingExamStart, selected: number[]) => {
    setPhase("finishing");
    const answersBody: ReadingExamAnswer[] = payload.items.map((item, i) => ({
      readingTextId: item.readingTextId,
      questionId: item.questionId,
      selectedIndex: selected[i] ?? unansweredIndex(),
    }));
    try {
      const raw = await finishReadingExam(payload.examSessionId, answersBody);
      if (userId) clearReadingExamIntent(userId);
      // The backend returns a full result — correct/total, percentage, its own
      // criterion verdict, the indicated level (and REDS for Listening). This
      // used to reduce all of it to `record.score`, which for Reading is a
      // RATIO (hence the bare "0.65") and for Listening does not exist at all
      // (hence the literal "Submitted."). See lib/api/examResult.ts.
      setResult(decodeExamResult(raw));
      setPhase("done");
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setPhase("quota");
        return;
      }
      setMessage(err instanceof FrontendError ? err.message : "This exam session is no longer available.");
      setPhase("error");
    }
  }, [userId]);

  const begin = useCallback(async () => {
    let uid = userId;
    if (!uid) {
      const me = (await fetch("/api/auth/me", { credentials: "same-origin" }).then((r) => r.json())) as { userId?: string };
      uid = me.userId ?? "anon";
    }
    setUserId(uid);
    setPhase("starting");
    setMessage("");
    try {
      const start = await startReadingExam(uid);
      setExam(start);
      setAnswers(start.items.map(() => unansweredIndex()));
      setIndex(0);
      setPhase("live");
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
      setMessage(`Couldn’t start the exam. ${quotaReassurance(err)}`.trim());
      setPhase("error");
    }
  }, [userId]);

  const expire = useCallback(() => {
    if (exam) void finish(exam, answersRef.current);
  }, [exam, finish]);

  const item = exam?.items[index] ?? null;
  const selected = item ? (answers[index] ?? unansweredIndex()) : unansweredIndex();
  const displaySelected = selected < 0 ? null : selected;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (phase !== "live" || !item) return;
      if (event.key >= "1" && event.key <= "4") {
        const choice = Number(event.key) - 1;
        if (choice < item.options.length) {
          setAnswers((prev) => prev.map((value, i) => (i === index ? choice : value)));
        }
      }
      if (event.key === "ArrowRight" || event.key === "j") setIndex((i) => Math.min((exam?.items.length ?? 1) - 1, i + 1));
      if (event.key === "ArrowLeft" || event.key === "k") setIndex((i) => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, item, index, exam]);

  const answeredCount = useMemo(
    () => answers.filter((value) => value >= 0).length,
    [answers],
  );

  return (
    <ExerciseShell
      skill="Reading"
      mode="Exam"
      title="Exam simulation"
      progress={phase === "live" && exam ? { current: index + 1, total: exam.items.length } : null}
      toolbar={
        phase === "live" && exam ? (
          <div className="exam-toolbar">
            <ExamTimer seconds={exam.timeLimitSeconds} onExpire={expire} />
          </div>
        ) : null
      }
    >
      {phase === "gate" ? (
        <ExamDisclaimerGate skill="reading" onAccept={() => void begin()} onCancel={() => router.push("/reading")} />
      ) : null}
      {phase === "starting" ? <p className="muted">Preparing the form…</p> : null}
      {phase === "quota" ? <CommercialCard title="Exam simulation is not available on your current plan." /> : null}
      {phase === "error" ? (
        <article className="home-card">
          <p>{message}</p>
          <button className="btn btn-primary" type="button" onClick={() => setPhase("gate")}>
            Back
          </button>
        </article>
      ) : null}

      {phase === "live" && exam && item ? (
        <div className="exam-live">
          <p className="exam-count muted">answered {answeredCount} of {exam.items.length}</p>
          <div className="reading-workspace">
          <article className="reading-passage">
            {item.passageTitle ? <h2>{item.passageTitle}</h2> : null}
            <div className="passage-body">{item.passageText}</div>
          </article>
          <article className="question-pane">
            <p className="home-kicker">Question</p>
            <h2>{item.prompt}</h2>
            <OptionList
              options={item.options}
              selected={displaySelected}
              locked={false}
              onSelect={(choice) => setAnswers((prev) => prev.map((value, i) => (i === index ? choice : value)))}
            />
            <div className="cta-row">
              <button className="btn btn-outline" type="button" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
                Previous
              </button>
              <button
                className="btn btn-outline"
                type="button"
                disabled={index >= exam.items.length - 1}
                onClick={() => setIndex((i) => i + 1)}
              >
                Next
              </button>
              <button className="btn btn-primary" type="button" onClick={() => void finish(exam, answers)}>
                Finish exam
              </button>
            </div>
          </article>
          </div>
        </div>
      ) : null}

      {phase === "finishing" ? <p className="muted">Submitting…</p> : null}
      {phase === "done" ? (
        <ExamResultCard
          result={result}
          skill="Reading"
          backHref="/reading"
          backLabel="Back to Reading"
          practiceHref="/reading/practice"
        />
      ) : null}
    </ExerciseShell>
  );
}
