import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AdminRequestError, adminDeniedCopy, isAdminDenied } from "../../lib/api/admin";
import { decidePolicy } from "../../lib/server/proxyPolicy";

describe("admin gate", () => {
  it("treats backend 403 Admin access required as a denied administrator, not a local isAdmin flag", () => {
    const error = new AdminRequestError(403, "Admin access required");
    expect(isAdminDenied(error)).toBe(true);
    expect(adminDeniedCopy(error)).toBe("This account is not an administrator.");
  });

  it("does not treat unrelated 403s as admin denial", () => {
    expect(isAdminDenied(new AdminRequestError(403, "feature_not_in_plan"))).toBe(false);
    expect(isAdminDenied(new AdminRequestError(401, "Authorization required"))).toBe(false);
  });
});

describe("admin proxy surface", () => {
  it("keeps every shared-secret generate/reconcile route denied", () => {
    expect(decidePolicy("POST", "/api/admin/billing/reconcile").action).toBe("deny");
    expect(decidePolicy("GET", "/api/internal/foo").action).toBe("deny");
    expect(decidePolicy("POST", "/api/listening/generate").action).toBe("deny");
    expect(decidePolicy("GET", "/api/listening/telemetry/metrics").action).toBe("deny");
  });
});

describe("admin client sources", () => {
  it("never embeds a Render host, admin secret, or local isAdmin decision", () => {
    const files = [
      "lib/api/admin.ts",
      "components/admin/AdminConsole.tsx",
      "app/admin/page.tsx",
      "app/admin/layout.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("onrender.com");
      expect(source).not.toContain("X-Admin-Secret");
      expect(source).not.toContain("ADMIN_SECRET");
      expect(source).not.toMatch(/isAdmin\s*=/);
      expect(source).not.toContain("localStorage.setItem(\"token\"");
    }
  });
});
