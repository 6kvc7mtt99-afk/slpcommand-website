/** @vitest-environment happy-dom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReadinessInstrument } from "../../components/instrument/ReadinessInstrument";
import { decodeSpeakingEvaluate, summariseExamTasks } from "../../lib/speaking/evaluate";
import { decodeProgress, displayOverallLevel, isMeasuredLevel } from "../../lib/api/progress";

afterEach(() => {
  cleanup();
});

/**
 * `SLP 0` is the backend saying "not measured", never a level a learner holds.
 *
 * The rule existed (isMeasuredLevel) and was applied unevenly: Home screened
 * the per-skill rows with it, /progress screened only its table, and the
 * instrument's centre dial — the largest number on either screen — screened
 * nothing at all.
 */
describe("a zero level is never presented as a measurement", () => {
  it("the instrument's centre dial refuses a non-positive overall", () => {
    const { rerender } = render(<ReadinessInstrument skills={[]} overall={0} target={3} />);
    expect(screen.getByText("No estimate")).toBeTruthy();
    expect(screen.queryByText("Estimated")).toBeNull();

    rerender(<ReadinessInstrument skills={[]} overall={-1} target={3} />);
    expect(screen.getByText("No estimate")).toBeTruthy();

    rerender(<ReadinessInstrument skills={[]} overall={2.4} target={3} />);
    expect(screen.getByText("Estimated")).toBeTruthy();
    expect(screen.getByText("2.4")).toBeTruthy();
  });

  it("isMeasuredLevel is the shared predicate, and it excludes zero", () => {
    expect(isMeasuredLevel(0)).toBe(false);
    expect(isMeasuredLevel("0")).toBe(false);
    expect(isMeasuredLevel(null)).toBe(false);
    expect(isMeasuredLevel(-2)).toBe(false);
    expect(isMeasuredLevel("2.2")).toBe(true);
    expect(isMeasuredLevel(0.1)).toBe(true);
  });

  it("a zero overall still decodes, so the screening — not the decoder — must hold", () => {
    const progress = decodeProgress({
      overall: { level: 0, confidence: "none", available: true },
      skills: {},
    });
    expect(displayOverallLevel(progress!)).toBe(0);
    expect(isMeasuredLevel(displayOverallLevel(progress!))).toBe(false);
  });
});

/**
 * An unassessed speaking task is not a failed one.
 */
describe("exam task summary counts only what was assessed", () => {
  const task = (id: string, criteria: Record<string, unknown>, credited: boolean) =>
    decodeSpeakingEvaluate({
      attempt_id: id,
      rating: { credited, levelAttempted: "3", criteria },
    })!;

  const met = { content: { met: true }, tasks: { met: true }, accuracy: { met: true }, textProduced: { met: true } };
  const unmet = { content: { met: false }, tasks: { met: false }, accuracy: { met: false }, textProduced: { met: false } };
  // No verdict on any criterion: the engine declined to judge this take.
  const unjudged = { content: {}, tasks: {}, accuracy: {}, textProduced: {} };

  it("does not fold an unjudged take into the failures", () => {
    const summary = summariseExamTasks([
      task("a", met, true),
      task("b", unmet, false),
      task("c", unjudged, false),
    ]);
    // The old line said "1 of 3". Two tasks were assessed, and one of them met.
    expect(summary).toEqual({ rated: 2, credited: 1, unassessed: 1 });
  });

  it("reports nothing rated when nothing was judged, rather than 0 of N", () => {
    expect(summariseExamTasks([task("a", unjudged, false), task("b", unjudged, false)])).toEqual({
      rated: 0,
      credited: 0,
      unassessed: 2,
    });
  });

  it("is exact when every task was judged", () => {
    expect(summariseExamTasks([task("a", met, true), task("b", met, true)])).toEqual({
      rated: 2,
      credited: 2,
      unassessed: 0,
    });
  });

  it("a partially judged take still counts as assessed", () => {
    const partial = { content: { met: true }, tasks: {}, accuracy: {}, textProduced: {} };
    expect(summariseExamTasks([task("a", partial, false)])).toEqual({
      rated: 1,
      credited: 0,
      unassessed: 0,
    });
  });
});
