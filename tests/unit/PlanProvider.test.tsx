/** @vitest-environment happy-dom */

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const read = vi.fn();
vi.mock("../../lib/plan/refresh", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/plan/refresh")>();
  return { ...actual, readEntitlements: () => read() };
});

import { PlanProvider, usePlan } from "../../components/app/PlanProvider";
import { interpretEntitlements } from "../../lib/entitlements";

afterEach(() => {
  cleanup();
  read.mockReset();
});

function Probe() {
  const { display, isPro, rechecking, recheck } = usePlan();
  return (
    <div>
      <span data-testid="label">{display.label}</span>
      <span data-testid="known">{String(display.known)}</span>
      <span data-testid="pro">{String(isPro)}</span>
      <button type="button" onClick={() => void recheck()} disabled={rechecking}>
        recheck
      </button>
    </div>
  );
}

/**
 * The shared commercial state is a MIRROR, not an authority.
 *
 * Everything here exists to prove one thing: nothing a browser can do turns
 * this into access. The only input is what the server said, the only way to
 * change it is to ask the server again, and a server that says Free keeps
 * saying Free however many times it is asked.
 */
describe("shared plan state", () => {
  it("shows the server's answer", () => {
    render(
      <PlanProvider initial={interpretEntitlements(200, { plan: { key: "pro" } })}>
        <Probe />
      </PlanProvider>,
    );
    expect(screen.getByTestId("label").textContent).toBe("SLP Command Pro");
    expect(screen.getByTestId("pro").textContent).toBe("true");
  });

  it("says so when there isn't one", () => {
    render(
      <PlanProvider initial={{ status: "error" }}>
        <Probe />
      </PlanProvider>,
    );
    expect(screen.getByTestId("label").textContent).toBe("Plan unavailable");
    expect(screen.getByTestId("known").textContent).toBe("false");
    expect(screen.getByTestId("pro").textContent).toBe("false");
  });

  it("publishes Pro only when the backend confirms it", async () => {
    read.mockResolvedValue({ status: 200, body: { plan: { key: "pro" }, features: [] } });
    render(
      <PlanProvider initial={{ status: "noPlan" }}>
        <Probe />
      </PlanProvider>,
    );
    expect(screen.getByTestId("pro").textContent).toBe("false");
    await act(async () => {
      screen.getByRole("button", { name: "recheck" }).click();
    });
    expect(screen.getByTestId("label").textContent).toBe("SLP Command Pro");
  });

  it("a backend that keeps saying Free is never talked round", async () => {
    read.mockResolvedValue({ status: 200, body: { plan: { key: "free" }, features: [] } });
    render(
      <PlanProvider initial={{ status: "noPlan" }}>
        <Probe />
      </PlanProvider>,
    );
    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        screen.getByRole("button", { name: "recheck" }).click();
      });
    }
    expect(screen.getByTestId("pro").textContent).toBe("false");
    expect(screen.getByTestId("label").textContent).toBe("SLP Command Free");
  });

  it("a failed re-read downgrades to unknown rather than up to Pro", async () => {
    read.mockResolvedValue({ status: 503, body: null });
    let recheck: () => Promise<boolean> = async () => false;
    function Capture() {
      recheck = usePlan().recheck;
      return <Probe />;
    }
    render(
      <PlanProvider initial={interpretEntitlements(200, { plan: { key: "pro" } })}>
        <Capture />
      </PlanProvider>,
    );
    let confirmed = true;
    await act(async () => {
      confirmed = await recheck();
    });
    expect(confirmed).toBe(false);
    expect(screen.getByTestId("pro").textContent).toBe("false");
    // An outage is not a downgrade to Free — it is "we do not know".
    expect(screen.getByTestId("label").textContent).toBe("Plan unavailable");
  });

  it("exposes no way to set the plan — the context has read and recheck, nothing else", () => {
    let captured: Record<string, unknown> = {};
    function Capture() {
      captured = usePlan() as unknown as Record<string, unknown>;
      return null;
    }
    render(
      <PlanProvider initial={{ status: "noPlan" }}>
        <Capture />
      </PlanProvider>,
    );
    expect(Object.keys(captured).sort()).toEqual(["display", "isPro", "recheck", "rechecking", "state"]);
    // No setter, no grant, no override — the only function is the one that
    // asks the server.
    expect(typeof captured.recheck).toBe("function");
    for (const key of Object.keys(captured)) {
      expect(key).not.toMatch(/^set|grant|unlock|override/i);
    }
  });

  it("outside the provider it degrades to the server snapshot it was handed", () => {
    function Standalone() {
      const { display } = usePlan(interpretEntitlements(200, { plan: { key: "pro" } }));
      return <span data-testid="label">{display.label}</span>;
    }
    render(<Standalone />);
    expect(screen.getByTestId("label").textContent).toBe("SLP Command Pro");
  });
});
