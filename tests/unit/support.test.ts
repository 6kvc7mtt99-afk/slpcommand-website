import { describe, expect, it } from "vitest";
import { contextFromPath } from "../../lib/api/support";
import { decidePolicy } from "../../lib/server/proxyPolicy";

describe("support context", () => {
  it("maps listening practice to listening/practice", () => {
    expect(contextFromPath("/listening/practice")).toEqual({
      client: "web",
      module: "listening",
      screen: "practice",
      appVersion: "web",
    });
  });

  it("maps dashboard to home", () => {
    expect(contextFromPath("/dashboard")).toMatchObject({ module: "home", screen: "dashboard" });
  });
});

describe("support proxy", () => {
  it("does not require idempotency on support messages", () => {
    expect(decidePolicy("POST", "/api/support/conversations/abc/messages")).toEqual({ action: "forward" });
  });
});
