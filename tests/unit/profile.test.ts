import { describe, expect, it } from "vitest";
import { decidePolicy } from "../../lib/server/proxyPolicy";

describe("account routes", () => {
  it("exports and deletes through the learner allowlist", () => {
    expect(decidePolicy("GET", "/api/account/export")).toEqual({ action: "forward" });
    expect(decidePolicy("DELETE", "/api/account")).toEqual({ action: "forward" });
    expect(decidePolicy("POST", "/api/reports")).toEqual({ action: "forward" });
    expect(decidePolicy("PATCH", "/api/profile")).toEqual({ action: "forward" });
  });
});
