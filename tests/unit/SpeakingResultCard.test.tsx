/** @vitest-environment happy-dom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SpeakingResultCard } from "../../components/speaking/SpeakingPractice";
import { decodeSpeakingEvaluate } from "../../lib/speaking/evaluate";

afterEach(cleanup);

const result = decodeSpeakingEvaluate({
  attempt_id: "a1",
  target_level: "3",
  rating: {
    credited: true,
    level_attempted: "3",
    criteria: {
      content: { met: true },
      tasks: { met: true },
      accuracy: { met: true },
      textProduced: { met: true },
    },
  },
})!;

describe("SpeakingResultCard — the result screen's next action", () => {
  // Both Speaking Practice and Speaking Exam used to render this card with
  // nothing after it: no retry, no link back, not even an exit — a real
  // dead end reached on every single speaking attempt. onNext is optional
  // so the exam's per-task list (which shares one footer after all three
  // cards) can still render the bare card.
  it("has no next-action footer when onNext is omitted", () => {
    render(<SpeakingResultCard result={result} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders the primary action and the secondary link when provided", () => {
    const onNext = vi.fn();
    render(
      <SpeakingResultCard
        result={result}
        onNext={onNext}
        nextLabel="Practice another prompt"
        primaryAction
        secondaryHref="/speaking/history"
        secondaryLabel="See speaking history"
      />
    );
    const button = screen.getByRole("button", { name: "Practice another prompt" });
    expect(button.className).toContain("btn-primary");
    const link = screen.getByRole("link", { name: /See speaking history/ });
    expect(link.getAttribute("href")).toBe("/speaking/history");
  });
});
