/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeDashboard } from "../../components/home/HomeDashboard";
import type { HomeV2Payload } from "../../lib/home/types";
import { decodeSessionToday } from "../../lib/api/sessionToday";
import { decodeProgress } from "../../lib/api/progress";

vi.mock("../../lib/api/client", () => ({
  apiRequest: vi.fn(() => Promise.reject(new Error("lazy isolated"))),
}));

afterEach(() => {
  cleanup();
});

const payload: HomeV2Payload = {
  flags: {
    reading_enabled: true,
    listening_enabled: true,
    writing_enabled: true,
    speaking_enabled: true,
    academy_enabled: true,
    home_v3_enabled: false,
  },
  entitlements: { status: "noPlan" },
  progress: decodeProgress({
    overall: { level: 2.2, available: true, confidence: "medium" },
    skills: {
      reading: { level: 2.4, available: true, confidence_label: "Good" },
      listening: { level: 3.3, available: true },
      writing: { level: 2.4, available: true },
      speaking: { level: 1.7, available: true },
    },
    proficiencyEngine: { effectiveLevel: 2.2 },
    totalExercises: 156,
  }),
  sessionToday: decodeSessionToday({
    mission: {
      headline: "Recover listening",
      reason: "Yesterday slipped.",
      coachLine: { headline: "Short clips", why: "Accuracy first", focus: "gist" },
    },
    session: {
      blocks: [
        {
          skill: "listening",
          minutes: 25,
          posture: "recovering",
          why: "Accuracy dipped",
          focus: "gist",
          academyFocus: "literal extraction",
        },
      ],
      difficulty: { level: "balanced", why: "Enough time" },
      skillsSkipped: [{ skill: "speaking", why: "Not in this session" }],
    },
    expectedOutcome: {
      certainties: [{ skill: "listening", text: "You will hear one more clip." }],
      projections: [{ skill: "listening", text: "Confidence may recover." }],
      passProbability: 0.72,
    },
  }),
  streak: { current: 4, longest: 10, timezone: "UTC" },
  greetingName: "Rafael",
  timezone: "UTC",
  minutes: 25,
};

describe("HomeDashboard", () => {
  it("renders the v2 layout and never shows passProbability", () => {
    const { container } = render(<HomeDashboard initial={payload} userId="user-1" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Rafael");
    expect(screen.getByText("Recover listening")).toBeTruthy();
    expect(screen.getByText("recovering")).toBeTruthy();
    expect(screen.getByText("You will hear one more clip.")).toBeTruthy();
    expect(screen.getByText("SLP Command Free")).toBeTruthy();
    expect(screen.getByText("Longest: 10")).toBeTruthy();
    expect(screen.getByLabelText("Estimated SLP 2.2")).toBeTruthy();
    expect(container.textContent).not.toContain("0.72");
    expect(container.textContent).not.toContain("72%");
    expect(container.textContent).not.toContain("passProbability");
    expect(container.textContent).not.toContain("generationMs");
  });

  it("hides the mission card and ring when those payloads failed", () => {
    render(
      <HomeDashboard
        initial={{ ...payload, sessionToday: null, progress: null, streak: null }}
        userId="user-1"
      />,
    );
    expect(screen.queryByText("Today’s mission")).toBeNull();
    expect(screen.queryByText("Estimated SLP")).toBeNull();
    expect(screen.queryByText("Streak")).toBeNull();
    expect(screen.getByText("SLP Command Free")).toBeTruthy();
    expect(screen.getByText("No mission card today. Progress and plan stay available.")).toBeTruthy();
  });
});
