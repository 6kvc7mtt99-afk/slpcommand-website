"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, FrontendError } from "@/lib/api/client";
import {
  WRITING_EXAM_MINUTES,
  WRITING_EXAM_WORD_TARGET,
  WRITING_LOW_WORD_SECONDS,
  WRITING_LOW_WORD_THRESHOLD,
  decodeWritingCorrection,
  decodeWritingPrompt,
  draftStorageKey,
  submitModeForBand,
  wordCount,
  writingSubmitKey,
  type WritingCorrection,
  type WritingPrompt,
} from "@/lib/api/writing";
import { CommercialCard, ExerciseShell } from "@/components/exercise/ExerciseShell";
import { ExamDisclaimerGate } from "@/components/exercise/ExamDisclaimerGate";
import { ExamTimer } from "@/components/exercise/ExamTimer";
import { WritingEditor } from "./WritingEditor";

type Phase = "gate" | "loading" | "live" | "evaluating" | "done" | "quota" | "error";

export function WritingExam() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("gate");
  const [userId, setUserId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<WritingPrompt | null>(null);
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<WritingCorrection | null>(null);
  const [message, setMessage] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(WRITING_EXAM_MINUTES * 60);
  const started = useRef(Date.now());
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const promptRef = useRef(prompt);
  promptRef.current = prompt;

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((data: { userId?: string }) => setUserId(data.userId ?? "anon"));
  }, []);

  useEffect(() => {
    if (phase !== "live") return;
    const tick = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(tick);
  }, [phase]);

  useEffect(() => {
    if (!userId || phase !== "live") return;
    const id = window.setInterval(() => {
      try {
        localStorage.setItem(draftStorageKey(userId), JSON.stringify({
          writingPromptId: promptRef.current?.writingPromptId ?? "",
          text: draftRef.current,
          savedAt: Date.now(),
        }));
      } catch {
        /* ignore */
      }
    }, 4000);
    return () => window.clearInterval(id);
  }, [userId, phase]);

  const begin = useCallback(async () => {
    setPhase("loading");
    try {
      const profile = await apiRequest<{ target_level?: string }>("/profile").catch(() => ({ target_level: "3" }));
      const rawLevel = profile.target_level === "2" ? "2" : profile.target_level === "2+" ? "2+" : "3";
      const raw = await apiRequest<unknown>(`/writing/prompts/next?mode=exam&targetLevel=${encodeURIComponent(rawLevel)}`);
      const next = decodeWritingPrompt(raw);
      if (!next) throw new Error("invalid_prompt");
      setPrompt(next);
      started.current = Date.now();
      setSecondsLeft(WRITING_EXAM_MINUTES * 60);
      if (userId) {
        try {
          const saved = localStorage.getItem(draftStorageKey(userId));
          if (saved) {
            const parsed = JSON.parse(saved) as { writingPromptId?: string; text?: string };
            if (parsed.writingPromptId === next.writingPromptId && parsed.text) setDraft(parsed.text);
          }
        } catch {
          /* ignore */
        }
      }
      setPhase("live");
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setPhase("quota");
        return;
      }
      setMessage(err instanceof FrontendError ? err.message : "No writing prompt is available right now.");
      setPhase("error");
    }
  }, [userId]);

  const submit = useCallback(async (auto = false) => {
    if (!prompt) return;
    const text = draftRef.current;
    if (!auto && text.length < 80) {
      setMessage("Write at least 80 characters before submitting.");
      return;
    }
    setPhase("evaluating");
    const mode = submitModeForBand(prompt.levelBand);
    try {
      const key = await writingSubmitKey(prompt.writingPromptId, text);
      const raw = await apiRequest<unknown>("/writing/submit", {
        method: "POST",
        idempotencyKey: key,
        body: {
          writingPromptId: prompt.writingPromptId,
          mode,
          userText: text,
          timeSpentSeconds: Math.max(1, Math.round((Date.now() - started.current) / 1000)),
        },
      });
      const correction = decodeWritingCorrection(raw);
      if (userId) localStorage.removeItem(draftStorageKey(userId));
      setResult(correction ? { ...correction, formative: mode === "formative_exam" } : null);
      setPhase("done");
    } catch (err) {
      if (err instanceof FrontendError && (err.code === "quota" || err.code === "entitlement")) {
        setPhase("quota");
        return;
      }
      setMessage(err instanceof FrontendError ? err.message : "Something went wrong evaluating that text.");
      setPhase("live");
    }
  }, [prompt, userId]);

  const words = wordCount(draft);
  const lowWord = words < WRITING_LOW_WORD_THRESHOLD && secondsLeft <= WRITING_LOW_WORD_SECONDS;
  const examMode = prompt ? submitModeForBand(prompt.levelBand) : "exam";

  return (
    <ExerciseShell
      skill="Writing"
      mode="Exam"
      title={examMode === "formative_exam" ? "Exam Simulation — Indicative" : "Writing exam"}
    >
      {phase === "gate" ? (
        <ExamDisclaimerGate skill="writing" onAccept={() => void begin()} onCancel={() => router.push("/writing")} />
      ) : null}
      {phase === "loading" ? <p className="muted">Loading the exam prompt…</p> : null}
      {phase === "quota" ? <CommercialCard /> : null}
      {phase === "error" ? (
        <article className="home-card">
          <p>{message}</p>
          <button className="btn btn-primary" type="button" onClick={() => setPhase("gate")}>Back</button>
        </article>
      ) : null}
      {phase === "live" && prompt ? (
        <div className="exam-live">
          <div className="exam-toolbar">
            <ExamTimer seconds={WRITING_EXAM_MINUTES * 60} onExpire={() => void submit(true)} />
          </div>
          {examMode === "formative_exam" ? (
            <p className="home-banner">This is an indicative simulation. The result is not an SLP level.</p>
          ) : null}
          <div className="writing-workspace">
          <aside className="writing-task">
            {prompt.title ? <h2>{prompt.title}</h2> : null}
            <div className="passage-body">{prompt.prompt}</div>
            <p className="muted">Word target {prompt.wordTarget || WRITING_EXAM_WORD_TARGET}. Mode follows the item band, not your profile picker.</p>
          </aside>
          <div>
            <WritingEditor
              value={draft}
              onChange={setDraft}
              wordTarget={prompt.wordTarget || WRITING_EXAM_WORD_TARGET}
            />
            {lowWord ? <p className="err" role="status">Fewer than 180 words and under five minutes remain.</p> : null}
            {message ? <p className="err" role="status">{message}</p> : null}
            <button className="btn btn-primary" type="button" onClick={() => void submit(false)}>Submit exam</button>
          </div>
          </div>
        </div>
      ) : null}
      {phase === "evaluating" ? <p className="muted">Submitting to the evaluator…</p> : null}
      {phase === "done" ? (
        <article className="home-card">
          <h2>{examMode === "formative_exam" ? "Indicative feedback" : "Exam submitted"}</h2>
          {examMode === "formative_exam" ? (
            <p className="muted">This is not a level. Only an official examining body can award SLP.</p>
          ) : null}
          {result?.taskFulfilment ? <p><strong>Task fulfilment.</strong> {result.taskFulfilment}</p> : null}
          {result?.correction ? <div className="passage-body">{result.correction}</div> : <p>Submitted.</p>}
          <button className="btn btn-primary" type="button" onClick={() => router.push("/writing")}>Back to Writing</button>
        </article>
      ) : null}
    </ExerciseShell>
  );
}
