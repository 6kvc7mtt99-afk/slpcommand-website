/** @vitest-environment happy-dom */

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The bounded re-read is stubbed, not re-timed.
 *
 * `planRecheck.test.ts` already pins the real schedule (five reads,
 * 300/500/800/1100/1100 ms) and its never-grant-locally property. What these
 * tests are about is what the SCREEN does with the answer, so the answer
 * arrives immediately and the assertions stay about behaviour.
 */
const serverSays = vi.fn();
vi.mock("../../lib/plan/refresh", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/plan/refresh")>();
  return {
    ...actual,
    recheckEntitlements: async () => {
      const { status, body } = serverSays();
      const { interpretEntitlements, isEntitledToPro } = await import("../../lib/entitlements");
      const state = interpretEntitlements(status, body);
      return { isPro: isEntitledToPro(state), state, attempts: 1 };
    },
  };
});

import { PlanProvider } from "../../components/app/PlanProvider";
import { SubscriptionView } from "../../components/plan/SubscriptionView";
import { interpretEntitlements } from "../../lib/entitlements";
import type { WebOfferState } from "../../lib/plan/offer";

const FREE = interpretEntitlements(200, { plan: { key: "free", name: "Free" }, features: [] });
const PRO_BODY = { status: 200, body: { plan: { key: "pro" }, features: [] } };
const FREE_BODY = { status: 200, body: { plan: { key: "free" }, features: [] } };

const OFFER: WebOfferState = {
  status: "ready",
  offer: { productId: "com.slpcommand.pro.monthly", planName: "SLP Command Pro", displayPrice: null, period: null },
};

let assigned: string[] = [];

function mount(opts: { offer?: WebOfferState; billingEnabled?: boolean } = {}) {
  return render(
    <PlanProvider initial={FREE}>
      <SubscriptionView
        initial={FREE}
        offer={opts.offer ?? OFFER}
        billingEnabled={opts.billingEnabled ?? true}
      />
    </PlanProvider>,
  );
}

beforeEach(() => {
  assigned = [];
  serverSays.mockReset();
  vi.stubGlobal("fetch", vi.fn());
  // Keep the real Location (so href/search/replaceState behave), and replace
  // only the navigation call, which jsdom-likes cannot perform.
  Object.defineProperty(window.location, "assign", {
    configurable: true,
    writable: true,
    value: (url: string) => assigned.push(url),
  });
  window.history.replaceState({}, "", "/subscription");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the checkout entry point", () => {
  it("is absent while the kill switch is off, and the iOS route is offered instead", () => {
    mount({ billingEnabled: false });
    expect(screen.queryByRole("button", { name: "Subscribe" })).toBeNull();
    expect(screen.getByText("SLP Command Professional is purchased in the iOS app")).toBeTruthy();
  });

  it("is absent when the server has no offer configured, even with the switch on", () => {
    mount({ offer: { status: "unconfigured" }, billingEnabled: true });
    expect(screen.queryByRole("button", { name: "Subscribe" })).toBeNull();
  });

  it("appears only when the switch is on and an offer exists", () => {
    mount();
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeTruthy();
  });

  it("quotes no price when the server was not configured with one", () => {
    mount();
    expect(screen.getByText("The price is shown on the secure checkout page before you pay.")).toBeTruthy();
  });

  it("shows the configured price, and never a number of its own", () => {
    mount({
      offer: {
        status: "ready",
        offer: { productId: "p", planName: "SLP Command Pro", displayPrice: "€9.99", period: "month" },
      },
    });
    expect(screen.getByText("€9.99")).toBeTruthy();
    expect(screen.getByText("/ month")).toBeTruthy();
  });

  it("asks the server for the URL rather than assembling one", async () => {
    // The identity on the checkout link has to come from the session cookie.
    // A URL built in the browser could carry someone else's App User ID.
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://pay.rev.cat/x?app_user_id=user-1" }),
    });
    mount();
    await act(async () => {
      screen.getByRole("button", { name: "Subscribe" }).click();
    });
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/billing/checkout", expect.objectContaining({ method: "POST" }));
    expect(assigned).toEqual(["https://pay.rev.cat/x?app_user_id=user-1"]);
  });

  it("says nothing was charged when the checkout cannot be opened", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, json: async () => ({}) });
    mount();
    await act(async () => {
      screen.getByRole("button", { name: "Subscribe" }).click();
    });
    expect(screen.getByRole("alert").textContent).toContain("Nothing was charged");
    expect(assigned).toEqual([]);
  });
});

describe("coming back from checkout", () => {
  function returnFromCheckout() {
    window.history.replaceState({}, "", "/subscription?checkout=return");
  }

  it("does not claim Pro on the strength of the redirect alone", async () => {
    // The decisive test. Returning from a hosted checkout is not a receipt —
    // there is no signed proof in that redirect. The server says Free, so the
    // page says pending, never Pro.
    serverSays.mockReturnValue(FREE_BODY);
    returnFromCheckout();
    mount();
    await vi.waitFor(() => expect(screen.getByText(/still being confirmed/)).toBeTruthy());
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("SLP Command Free");
    expect(screen.queryByText("Confirmed — this account is on SLP Command Pro.")).toBeNull();
    // And the purchase button is gone, so a learner who reads "Free" at the
    // top of the page cannot conclude the payment failed and pay twice.
    expect(screen.queryByRole("button", { name: "Subscribe" })).toBeNull();
    expect(screen.getByText(/Don.t pay again/)).toBeTruthy();
  });

  it("confirms Pro only once the server says so", async () => {
    serverSays.mockReturnValue(PRO_BODY);
    returnFromCheckout();
    mount();
    await vi.waitFor(
      () => expect(screen.getByText("Confirmed — this account is on SLP Command Pro.")).toBeTruthy(),
      );
  });

  it("strips the marker so a reload cannot replay a purchase state", async () => {
    serverSays.mockReturnValue(FREE_BODY);
    returnFromCheckout();
    expect(window.location.search).toContain("checkout=return");
    mount();
    await vi.waitFor(() => expect(window.location.search).not.toContain("checkout=return"));
  });

  it("distinguishes a pending receipt from a plan that simply has not changed", async () => {
    // Same server answer, two different situations, two different sentences.
    serverSays.mockReturnValue(FREE_BODY);
    mount();
    await act(async () => {
      screen.getByRole("button", { name: "Check my plan again" }).click();
    });
    await vi.waitFor(
      () => expect(screen.getByText(/The server still reports this account as/)).toBeTruthy(),
      );
    expect(screen.queryByText(/still being confirmed/)).toBeNull();
  });
});
