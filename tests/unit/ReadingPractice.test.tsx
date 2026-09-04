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

  /**
   * The verdict comes from the SERVER, never from the passage.
   *
   * `GET /api/reading/passage` (server.js:3432) now withholds the answer key —
   * it passed `includeAnswers: true` until this was closed at the source, which
   * is why the fixture below still carries a `correctIndex`: it proves the key
   * is IGNORED even when present on the wire. The answer envelope says the
   * correct displayed index is 2, and that is what must be marked.
   *
   * (An earlier version of this note cited server.js:2705-2707. Those lines are
   * inside the LEGACY `GET /api/reading/next` handler, a route the proxy denies,
   * so they never described the live path.)
   */
  it("grades from the answer response, not from the passage", async () => {
    fetchApi.mockImplementation((path: string) =>
      Promise.resolve(
        path === "/reading/answer"
          ? {
              wasCorrect: true,
              correctIndex: 2,
              explanation: "Server explanation.",
              evidenceQuote: "…the briefing room at 0600…",
              newLevel: 2.4,
            }
          : passage,
      ),
    );
    const { ReadingPractice } = await import("../../components/reading/ReadingPractice");
    render(<ReadingPractice />);
    expect(await screen.findByText("Where should they report?")).toBeTruthy();
    expect(screen.getByText("Question 1 of 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Briefing room/i }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Correct"));
    // The server's explanation wins over the passage's.
    expect(screen.getByText("Server explanation.")).toBeTruthy();
    expect(screen.getByText("…the briefing room at 0600…")).toBeTruthy();
    expect(fetchApi.mock.calls[0][0]).toBe("/reading/passage");
    expect(fetchApi.mock.calls[1][0]).toBe("/reading/answer");
    expect(fetchApi.mock.calls[1][1].body.selectedIndex).toBe(1);
    expect(fetchApi.mock.calls[1][1].body.mode).toBe("training");
  });

  /**
   * A live passage carries correctIndex: null. Before the fix this rendered
   * `correct={false}` — "Not quite", in the failure colour, for every answer
   * including the right one.
   */
  it("never asserts a verdict the server did not give", async () => {
    fetchApi.mockImplementation((path: string) =>
      Promise.resolve(path === "/reading/answer" ? { ok: true } : { ...passage, questions: [{ ...passage.questions[0], correctIndex: null }] }),
    );
    const { ReadingPractice } = await import("../../components/reading/ReadingPractice");
    render(<ReadingPractice />);
    expect(await screen.findByText("Where should they report?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Briefing room/i }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Answer recorded"));
    expect(screen.queryByText("Not quite")).toBeNull();
    expect(screen.queryByText("Correct")).toBeNull();
  });

  /** A failed submit must not leave a graded-looking screen behind. */
  it("shows no verdict and reopens the question when the submit fails", async () => {
    fetchApi.mockImplementation((path: string) =>
      path === "/reading/answer" ? Promise.reject(new Error("network")) : Promise.resolve(passage),
    );
    const { ReadingPractice } = await import("../../components/reading/ReadingPractice");
    render(<ReadingPractice />);
    expect(await screen.findByText("Where should they report?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Briefing room/i }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("was not recorded"));
    expect(screen.queryByText("Not quite")).toBeNull();
    expect(screen.queryByText("Correct")).toBeNull();
    // The learner can try again rather than being locked out of their own answer.
    expect(screen.getByRole("button", { name: "Check answer" })).toBeTruthy();
  });
});
