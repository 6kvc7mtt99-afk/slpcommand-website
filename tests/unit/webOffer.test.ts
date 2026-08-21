import { describe, expect, it } from "vitest";
import { buildCheckoutUrl, readWebOffer } from "../../lib/plan/offer";
import { decodeFeatureFlags } from "../../lib/api/featureFlags";

const CONFIGURED = {
  WEB_BILLING_PRODUCT_ID: "com.slpcommand.pro.monthly",
  WEB_BILLING_PURCHASE_URL: "https://pay.rev.cat/abcdef/slpcommand",
} as unknown as NodeJS.ProcessEnv;

describe("the web offer", () => {
  it("does not exist until the server is configured for it", () => {
    expect(readWebOffer({} as NodeJS.ProcessEnv).status).toBe("unconfigured");
    // Half-configured is unconfigured: a product nobody can buy, or a link to
    // something we cannot name, are both useless and both fail closed.
    expect(readWebOffer({ WEB_BILLING_PRODUCT_ID: "x" } as unknown as NodeJS.ProcessEnv).status).toBe("unconfigured");
    expect(readWebOffer({ WEB_BILLING_PURCHASE_URL: "https://x.test" } as unknown as NodeJS.ProcessEnv).status).toBe(
      "unconfigured",
    );
  });

  it("quotes no price unless one was configured", () => {
    const state = readWebOffer(CONFIGURED);
    expect(state.status).toBe("ready");
    if (state.status !== "ready") return;
    expect(state.offer.productId).toBe("com.slpcommand.pro.monthly");
    // The checkout is the authority on what is charged; a page that quotes a
    // number the checkout disagrees with is worse than a page that quotes none.
    expect(state.offer.displayPrice).toBeNull();
    expect(state.offer.period).toBeNull();
  });

  it("carries a period only alongside a price, because alone it says nothing", () => {
    const priced = readWebOffer({
      ...CONFIGURED,
      WEB_BILLING_DISPLAY_PRICE: "€9.99",
      WEB_BILLING_PERIOD: "month",
    } as unknown as NodeJS.ProcessEnv);
    expect(priced.status === "ready" && priced.offer.displayPrice).toBe("€9.99");
    expect(priced.status === "ready" && priced.offer.period).toBe("month");

    const periodOnly = readWebOffer({ ...CONFIGURED, WEB_BILLING_PERIOD: "month" } as unknown as NodeJS.ProcessEnv);
    expect(periodOnly.status === "ready" && periodOnly.offer.period).toBeNull();
  });

  it("never leaks the purchase URL into the shape the browser receives", () => {
    const state = readWebOffer(CONFIGURED);
    expect(JSON.stringify(state)).not.toContain("pay.rev.cat");
  });
});

describe("the checkout URL", () => {
  it("binds the purchase to the account the server identified", () => {
    const url = buildCheckoutUrl("11111111-2222-3333-4444-555555555555", CONFIGURED);
    expect(url).toBe("https://pay.rev.cat/abcdef/slpcommand?app_user_id=11111111-2222-3333-4444-555555555555");
  });

  it("is the same identity iOS uses, so one purchase means one customer", () => {
    // Purchases.configure(appUserID: supabaseUserId) on iOS; the same UUID
    // here. No email matching, no linking, no merge.
    const uid = "11111111-2222-3333-4444-555555555555";
    expect(new URL(buildCheckoutUrl(uid, CONFIGURED)!).searchParams.get("app_user_id")).toBe(uid);
  });

  it("refuses to build anything without an identity", () => {
    expect(buildCheckoutUrl("", CONFIGURED)).toBeNull();
  });

  it("refuses a non-https or unparseable destination", () => {
    expect(buildCheckoutUrl("u", { ...CONFIGURED, WEB_BILLING_PURCHASE_URL: "http://pay.rev.cat/x" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(buildCheckoutUrl("u", { ...CONFIGURED, WEB_BILLING_PURCHASE_URL: "javascript:alert(1)" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(buildCheckoutUrl("u", { ...CONFIGURED, WEB_BILLING_PURCHASE_URL: "not a url" } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });

  it("overwrites any app_user_id already on the configured link", () => {
    // A misconfigured link must not be able to send everyone's purchase to
    // one account.
    const url = buildCheckoutUrl("real-user", {
      ...CONFIGURED,
      WEB_BILLING_PURCHASE_URL: "https://pay.rev.cat/x?app_user_id=someone-else",
    } as unknown as NodeJS.ProcessEnv);
    expect(new URL(url!).searchParams.getAll("app_user_id")).toEqual(["real-user"]);
  });
});

describe("the billing kill switch", () => {
  it("is off unless the backend explicitly says otherwise", () => {
    expect(decodeFeatureFlags({}).web_billing_enabled).toBe(false);
    expect(decodeFeatureFlags(null).web_billing_enabled).toBe(false);
    expect(decodeFeatureFlags({ web_billing_enabled: false }).web_billing_enabled).toBe(false);
    // Non-boolean truthiness must not open a checkout.
    expect(decodeFeatureFlags({ web_billing_enabled: "true" }).web_billing_enabled).toBe(false);
    expect(decodeFeatureFlags({ web_billing_enabled: 1 }).web_billing_enabled).toBe(false);
  });

  it("turns on only for a real boolean true, and reads camelCase too", () => {
    expect(decodeFeatureFlags({ web_billing_enabled: true }).web_billing_enabled).toBe(true);
    expect(decodeFeatureFlags({ webBillingEnabled: true }).web_billing_enabled).toBe(true);
    expect(decodeFeatureFlags({ flags: { web_billing_enabled: true } }).web_billing_enabled).toBe(true);
  });

  it("does not take the module flags' fail-open posture", () => {
    // Reading missing from the payload still works — losing a training screen
    // to a flags outage would be worse than the outage. A checkout appearing
    // because of one is a different order of mistake.
    const flags = decodeFeatureFlags({});
    expect(flags.reading_enabled).toBe(true);
    expect(flags.web_billing_enabled).toBe(false);
  });
});
