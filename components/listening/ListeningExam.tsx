"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FrontendError } from "@/lib/api/client";
import type { ListeningExamStart } from "@/lib/api/listeningExam";
import {
  clearListeningExamIntent,
  finishListeningExam,
  requestListeningPlay,
  startListeningExam,
  submitListeningExamAnswer,
} from "@/lib/listening/examSession";
import { AudioPlayer } from "@/components/exercise/AudioPlayer";
import { CommercialCard, ExerciseShell } from "@/components/exercise/ExerciseShell";
import { ExamDisclaimerGate } from "@/components/exercise/ExamDisclaimerGate";
import { ExamTimer } from "@/components/exercise/ExamTimer";
import { OptionList } from "@/components/exercise/OptionList";

type Phase = "gate" | "starting" | "live" | "finishing" | "done" | "quota" | "error";

export function ListeningExam() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("gate");
  const [userId, setUserId] = useState<string | null>(null);
  const [exam, setExam] = useState<ListeningExamStart | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState("Submitted.");
  const answersRef = useRef(answers);
  answersRef.current = answers;

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((data: { userId?: string }) => setUserId(data.userId ?? "anon"));
  }, []);

  const finish = useCallback(async (payload: ListeningExamStart) => {
    setPhase("finishing");
    try {
      const raw = await finishListeningExam(payload.examSessionId);
      if (userId) clearListeningExamIntent(userId);
      const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      const score = record.score ?? record.percent ?? record.result;
      setResult(typeof score === "string" || typeof score === "number" ? String(score) : "Submitted.");
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
      setUserId(uid);
    }
    setPhase("starting");
    try {
      const start = await startListeningExam(uid);
      setExam(start);
      setAnswers(start.items.map(() => -1));
      setIndex(0);
      setPhase("live");
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setPhase("quota");
        return;
      }
      setMessage("Couldn't start the exam. You were not charged.");
      setPhase("error");
    }
  }, [userId]);

  const expire = useCallback(() => {
    if (exam) void finish(exam);
  }, [exam, finish]);

  const item = exam?.items[index] ?? null;

  async function choose(choice: number) {
    if (!exam || !item) return;
    setAnswers((prev) => prev.map((value, i) => (i === index ? choice : value)));
    try {
      await submitListeningExamAnswer(exam.examSessionId, item.position, choice);
    } catch {
      /* keep local selection; finish still sends last known */
    }
  }

  async function authorizePlay(): Promise<boolean> {
    if (!exam || !item) return false;
    try {
      const result = await requestListeningPlay(exam.examSessionId, item.position);
      return result.allowed;
    } catch {
      return false;
    }
  }

  return (
    <ExerciseShell
      skill="Listening"
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
      <p className="muted">No transcript — just like the real exam. Seeking is disabled.</p>
      {phase === "gate" ? (
        <ExamDisclaimerGate skill="listening" onAccept={() => void begin()} onCancel={() => router.push("/listening")} />
      ) : null}
      {phase === "starting" ? <p className="muted">Preparing the form…</p> : null}
      {phase === "quota" ? <CommercialCard title="Exam simulation is not available on your current plan." /> : null}
      {phase === "error" ? (
        <article className="home-card">
          <p>{message}</p>
          <button className="btn btn-primary" type="button" onClick={() => setPhase("gate")}>Back</button>
        </article>
      ) : null}
      {phase === "live" && exam && item ? (
        <div className="exam-live">
          <div className="exam-toolbar">
            <p className="exam-count muted">Question {index + 1} of {exam.items.length}</p>
          </div>
          <article className="audio-stage">
            <p className="home-kicker">Audio</p>
            <AudioPlayer key={`${exam.examSessionId}-${item.position}`} src={item.audioUrl} allowSeek={false} onPlayRequest={authorizePlay} />
          </article>
          <article className="question-pane">
            <h2>{item.prompt || "Choose the best answer."}</h2>
            <OptionList
              options={item.options}
              selected={answers[index] != null && answers[index]! >= 0 ? answers[index]! : null}
              locked={false}
              onSelect={(choice) => void choose(choice)}
            />
            <div className="cta-row">
              <button className="btn btn-outline" type="button" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>Previous</button>
              <button className="btn btn-outline" type="button" disabled={index >= exam.items.length - 1} onClick={() => setIndex((i) => i + 1)}>Next</button>
              <button className="btn btn-primary" type="button" onClick={() => void finish(exam)}>Finish exam</button>
            </div>
          </article>
        </div>
      ) : null}
      {phase === "finishing" ? <p className="muted">Submitting…</p> : null}
      {phase === "done" ? (
        <article className="home-card">
          <h2>Exam submitted</h2>
          <p>{result}</p>
          <p className="muted">This is educational guidance, not an official SLP result.</p>
          <div className="cta-row">
            <button className="btn btn-primary" type="button" onClick={() => router.push("/listening")}>Back to Listening</button>
            <Link className="btn btn-outline" href="/listening/intelligence">
              See what this means
              <span className="p-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </article>
      ) : null}
    </ExerciseShell>
  );
}
