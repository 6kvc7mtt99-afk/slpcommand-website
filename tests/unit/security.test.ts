import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { shouldRetryTransientGet } from "../../lib/server/backend";
import { decidePolicy } from "../../lib/server/proxyPolicy";

const CLIENT_GLOBS = [
  "lib/api/client.ts",
  "components/reading/ReadingPractice.tsx",
  "components/listening/ListeningPractice.tsx",
  "components/writing/WritingPractice.tsx",
  "app/(app)/profile/page.tsx",
];

describe("security regressions", () => {
  it("does not let the browser talk to Render or store a JWT", () => {
    for (const file of CLIENT_GLOBS) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("english-learning-backend");
      expect(source).not.toContain("BACKEND_URL");
      expect(source).not.toContain("localStorage.setItem(\"accessToken\"");
      expect(source).not.toContain("localStorage.setItem('jwt'");
    }
  });

  it("retries only idempotent GET transients", () => {
    expect(shouldRetryTransientGet("GET", 503)).toBe(true);
    expect(shouldRetryTransientGet("POST", 503)).toBe(false);
    expect(shouldRetryTransientGet("GET", 404)).toBe(false);
  });

  it("keeps quota GETs on the allowlist and legacy starts denied", () => {
    expect(decidePolicy("GET", "/api/reading/passage")).toEqual({ action: "forward" });
    expect(decidePolicy("POST", "/api/reading/exam/start")).toMatchObject({ status: 410 });
  });
});
