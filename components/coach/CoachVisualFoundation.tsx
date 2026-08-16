/** Presentational Coach language for PR-20. No session logic. */

export type CoachVisualState = "pre" | "mic" | "live" | "speaking" | "listening" | "ending" | "debrief";

const COPY: Record<CoachVisualState, { kicker: string; title: string; detail: string }> = {
  pre: { kicker: "Coach", title: "Prepare the room", detail: "Confirm microphone and remaining time before the session starts." },
  mic: { kicker: "Microphone", title: "Ready to listen", detail: "The browser has microphone access. The session has not started." },
  live: { kicker: "Live", title: "Session in progress", detail: "Stay on this tab. Hiding the tab will end the conversation." },
  speaking: { kicker: "Speaking", title: "Examiner is speaking", detail: "Listen. Do not record a second take — this is a live exchange." },
  listening: { kicker: "Your turn", title: "Examiner is listening", detail: "Answer in complete sentences. Silence is part of the exam." },
  ending: { kicker: "Ending", title: "Closing the session", detail: "The conversation is being torn down. Wait for the debrief." },
  debrief: { kicker: "Debrief", title: "Session complete", detail: "Feedback comes from the backend. Nothing is scored in the browser." },
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
        <p className="coach-meta">
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
