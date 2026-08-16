import { describe, expect, it } from "vitest";
import { coachStateFromSpike } from "../../components/coach/CoachVisualFoundation";

describe("coach visual foundation", () => {
  it("maps spike connection state to visual language without inventing product status", () => {
    expect(coachStateFromSpike({ status: "idle", isSpeaking: false, isListening: false, mic: "unknown" })).toBe("pre");
    expect(coachStateFromSpike({ status: "idle", isSpeaking: false, isListening: false, mic: "granted" })).toBe("mic");
    expect(coachStateFromSpike({ status: "connected", isSpeaking: false, isListening: false, mic: "granted" })).toBe("live");
    expect(coachStateFromSpike({ status: "connected", isSpeaking: true, isListening: false, mic: "granted" })).toBe("speaking");
    expect(coachStateFromSpike({ status: "connected", isSpeaking: false, isListening: true, mic: "granted" })).toBe("listening");
    expect(coachStateFromSpike({ status: "disconnected", isSpeaking: false, isListening: false, mic: "granted" })).toBe("ending");
  });
});
