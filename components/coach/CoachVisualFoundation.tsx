/**
 * The Coach's visual and verbal language.
 *
 * Turn-taking made visible: during a live conversation the learner is talking,
 * not reading, so the orb carries the state and the words underneath only ever
 * say what to DO about it.
 *
 * Two rules this copy obeys, and the PR-19 placeholder did not:
 *
 *  - The Coach teaches; it does not examine. Exam vocabulary ("examiner",
 *    "silence is part of the exam") described the wrong product — the session
 *    plan is a lesson with phases and a debrief, and calling it an exam would
 *    make a learner perform instead of practise.
 *  - Nothing here claims behaviour we have not verified. The placeholder said
 *    hiding the tab would end the conversation; backgrounding is UNVERIFIED
 *    (PR-19 matrix, row 12), so this asks the learner to stay rather than
 *    predicting what happens if they don't.
 */

export type CoachVisualState = "pre" | "mic" | "live" | "speaking" | "listening" | "ending" | "debrief";

const COPY: Record<CoachVisualState, { kicker: string; title: string; detail: string }> = {
  pre: { kicker: "Coach", title: "Prepare the room", detail: "Somewhere quiet, and a microphone you can talk into for a few minutes." },
  mic: { kicker: "Microphone", title: "Ready to listen", detail: "The browser has microphone access. Nothing is being recorded yet." },
  live: { kicker: "Live", title: "Session in progress", detail: "Keep this tab open while you talk." },
  speaking: { kicker: "Coach", title: "Your coach is speaking", detail: "Listen. You can answer as soon as they stop — there is no button to press." },
  listening: { kicker: "Your turn", title: "Your coach is listening", detail: "Answer in full sentences. A pause is fine; you are not being timed on it." },
  ending: { kicker: "Ending", title: "Closing the session", detail: "Your coach is reviewing the conversation. This takes a few seconds." },
  debrief: { kicker: "Debrief", title: "Session complete", detail: "The verdict comes from the server. Nothing is scored in the browser." },
};

export function CoachStage({
  state,
  remainingLabel,
}: {
  state: CoachVisualState;
  remainingLabel?: string;
}) {
  return (
    <div className={`coach-stage is-${state}`} data-coach-state={state}>
      <div className="coach-orb" aria-hidden="true" />
      <div>
        <p className="home-kicker">{COPY[state].kicker}</p>
        {/* Whose turn it is, announced. Without it a screen-reader user cannot
            tell "the coach is thinking" from "the app froze". */}
        <p className="coach-meta" aria-live="polite">
          <strong>{COPY[state].title}</strong>
          {remainingLabel ? ` · ${remainingLabel}` : ""}
        </p>
        <p className="muted">{COPY[state].detail}</p>
      </div>
    </div>
  );
}

export function coachStateFromSpike(input: {
  status: string;
  isSpeaking: boolean;
  isListening: boolean;
  mic: string;
}): CoachVisualState {
  if (input.status === "connected" && input.isSpeaking) return "speaking";
  if (input.status === "connected" && input.isListening) return "listening";
  if (input.status === "connected") return "live";
  if (input.status === "disconnecting" || input.status === "disconnected") return "ending";
  if (input.mic === "granted") return "mic";
  return "pre";
}
