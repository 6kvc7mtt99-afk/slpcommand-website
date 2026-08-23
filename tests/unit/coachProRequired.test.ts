// FASE F3-21 / F3-13 — the web must tell a Free learner that Coach is Pro.
//
// Two pieces of copy went stale the moment Coach was folded into Pro, and both
// failed silently — no error, no test, just a wrong sentence on screen:
//
//   1. Every 402 mapped to "You're out of Coach minutes for now." A Free
//      learner has never had a minute to be out of, so that reads as a bug and
//      hides the actual answer.
//   2. The dead-end body said Live Coach minutes were "not included in any
//      plan on sale today". True when written; false since F3-13. It is
//      reached only by an account with no allowance and no credits — a Free
//      learner — so it told exactly the person who could buy it that it was
//      not for sale.

import { describe, it, expect } from "vitest";
import { mapCoachStartError, COACH_START_COPY } from "@/lib/coach/errors";
import fs from "node:fs";
import path from "node:path";

describe("F3-21 — the two 402s are told apart", () => {
  it("pro_required maps to its own state, not to 'out of minutes'", () => {
    expect(mapCoachStartError({ status: 402, error: "pro_required" })).toBe("proRequired");
  });

  it("insufficient_minutes still maps to out-of-minutes", () => {
    expect(mapCoachStartError({ status: 402, error: "insufficient_minutes" })).toBe("insufficientMinutes");
    expect(mapCoachStartError({ status: 402 })).toBe("insufficientMinutes");
  });

  it("the more specific reason wins regardless of status", () => {
    // Order matters: a body carrying pro_required must never be swallowed by
    // the bare-402 fallback above it.
    expect(mapCoachStartError({ status: 402, reason: "pro_required" })).toBe("proRequired");
  });

  it("each state has copy, and the two do not say the same thing", () => {
    expect(COACH_START_COPY.proRequired).toBeTruthy();
    expect(COACH_START_COPY.proRequired).not.toBe(COACH_START_COPY.insufficientMinutes);
    expect(COACH_START_COPY.proRequired).toMatch(/Pro/);
  });

  it("the other reasons are unchanged", () => {
    expect(mapCoachStartError({ status: 403, error: "consent_required" })).toBe("consentRequired");
    expect(mapCoachStartError({ status: 409 })).toBe("sessionAlreadyOpen");
    expect(mapCoachStartError({ network: true })).toBe("network");
  });
});

describe("F3-13 — no screen still claims Coach is unsold", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "components/coach/CoachPreSession.tsx"), "utf8");

  it("the 'not included in any plan on sale today' sentence is gone", () => {
    expect(source).not.toContain("not included in any plan on sale today");
  });

  it("needs_pro is rendered explicitly, not left to the generic fallback", () => {
    expect(source).toContain('mission.eligibility === "needs_pro"');
  });

  it("the Free dead end names Pro and its real allowance", () => {
    expect(source).toMatch(/Pro includes 30 minutes/);
  });

  it("no top-up or separate Coach SKU is advertised to the learner", () => {
    // The commercial decision was explicit: Coach is inside Pro, with no
    // separate price and no minute top-ups. Checked against RENDERED copy —
    // comments legitimately discuss the SKUs that were considered and rejected,
    // and a test that could not tell the two apart would forbid explaining
    // the decision at all.
    const rendered = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(rendered).not.toMatch(/buy (more )?minutes|top ?-?up|coach_4h|coach_8h/i);
  });
});
