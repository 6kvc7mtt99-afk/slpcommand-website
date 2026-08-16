/** @vitest-environment happy-dom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchApi = vi.fn();

vi.mock("../../lib/api/client", () => {
  class FrontendError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }
  return {
    apiRequest: (...args: unknown[]) => fetchApi(...args),
    FrontendError,
  };
});

const passage = {
  readingTextId: "rt-1",
  title: "Orders",
  text: "Report to the briefing room at 0600.",
  genreDescriptor: "military",
  difficulty: "B2",
  questions: [
    {
      questionId: "q1",
      prompt: "Where should they report?",
      options: ["Mess", "Briefing room", "Gate", "Hangar"],
      correctIndex: 1,
      explanation: "The text names the briefing room.",
    },
  ],
};

afterEach(() => {
  cleanup();
});

describe("ReadingPractice", () => {
  beforeEach(async () => {
    fetchApi.mockReset();
    fetchApi.mockResolvedValue(passage);
    const session = await import("../../lib/reading/practiceSession");
    session.resetReadingPracticeSession();
  });

  it("loads one passage, accepts the displayed option, and shows immediate feedback", async () => {
    const { ReadingPractice } = await import("../../components/reading/ReadingPractice");
    render(<ReadingPractice />);
    expect(await screen.findByText("Where should they report?")).toBeTruthy();
    expect(screen.getByText("Question 1 of 1")).toBeTruthy();
    expect(screen.queryByText("Question 1 of 4")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Briefing room/i }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Correct"));
    expect(screen.getByText("The text names the briefing room.")).toBeTruthy();
    expect(fetchApi).toHaveBeenCalledTimes(2);
    expect(fetchApi.mock.calls[0][0]).toBe("/reading/passage");
    expect(fetchApi.mock.calls[1][0]).toBe("/reading/answer");
    expect(fetchApi.mock.calls[1][1].body.selectedIndex).toBe(1);
    expect(fetchApi.mock.calls[1][1].body.mode).toBe("training");
  });
});
