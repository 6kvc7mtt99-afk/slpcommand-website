/**
 * Coach v1 is desktop-first, and says so.
 *
 * PR-19 confirmed the real circuit on desktop Chrome only. Safari iOS
 * microphone, WebKit AudioContext suspension on backgrounding, and corporate
 * WebRTC blocks are all UNVERIFIED — so a phone is told the truth up front
 * rather than allowed to spend minutes on a conversation that may die at the
 * first lock-screen. Recorded Speaking Practice works everywhere and is the
 * offered alternative.
 *
 * Deliberately a claim about form factor, not about a vendor: nothing here
 * marks any browser as CONFIRMED.
 */
export type CoachEnvironment = { supported: boolean; reason: "mobile" | null };

const MOBILE = /Android|iPhone|iPad|iPod|Windows Phone|Mobile Safari|IEMobile|Opera Mini/i;

export function evaluateCoachEnvironment(input: {
  userAgent: string;
  /** iPadOS reports a desktop UA; a touch-only pointer still means a tablet. */
  maxTouchPoints?: number;
  platform?: string;
}): CoachEnvironment {
  const ua = input.userAgent ?? "";
  const iPadOnDesktopUa =
    (input.platform === "MacIntel" || /Macintosh/i.test(ua)) && (input.maxTouchPoints ?? 0) > 1;
  if (MOBILE.test(ua) || iPadOnDesktopUa) return { supported: false, reason: "mobile" };
  return { supported: true, reason: null };
}

export function readCoachEnvironment(): CoachEnvironment {
  if (typeof navigator === "undefined") return { supported: true, reason: null };
  return evaluateCoachEnvironment({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    platform: navigator.platform,
  });
}
