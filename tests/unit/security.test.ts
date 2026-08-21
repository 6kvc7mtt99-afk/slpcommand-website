import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { shouldRetryTransientGet } from "../../lib/server/backend";
import { decidePolicy } from "../../lib/server/proxyPolicy";

const CLIENT_GLOBS = [
  "lib/api/client.ts",
  "lib/api/admin.ts",
  "components/admin/AdminConsole.tsx",
  "components/reading/ReadingPractice.tsx",
  "components/listening/ListeningPractice.tsx",
  "components/writing/WritingPractice.tsx",
  "app/(app)/profile/page.tsx",
  "app/admin/page.tsx",
  "components/writing/WritingTools.tsx",
  "lib/api/writingTools.ts",
  "lib/api/speaking.ts",
  "components/speaking/SpeakingPractice.tsx",
  "components/speaking/SpeakingExam.tsx",
  "components/coach/CoachPreSession.tsx",
  "components/coach/CoachSession.tsx",
  "lib/coach/api.ts",
];

describe("security regressions", () => {
  it("does not let the browser talk to Render or store a JWT", () => {
    for (const file of CLIENT_GLOBS) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("english-learning-backend");
      expect(source).not.toContain("BACKEND_URL");
      expect(source).not.toContain("localStorage.setItem(\"accessToken\"");
      expect(source).not.toContain("localStorage.setItem('jwt'");
      expect(source).not.toContain("X-Admin-Secret");
      expect(source).not.toMatch(/isAdmin\s*=/);
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
    expect(decidePolicy("GET", "/api/writing/intelligence/readiness")).toMatchObject({ status: 410 });
    expect(decidePolicy("GET", "/api/writing/intelligence/missions")).toMatchObject({ status: 410 });
    expect(decidePolicy("GET", "/api/writing/intelligence/brain-profile")).toMatchObject({ status: 410 });
    expect(decidePolicy("GET", "/api/writing/intelligence/mastery")).toMatchObject({ status: 410 });
  });

  /**
   * The conversation token is the one credential the browser ever holds. It is
   * minted server-side, worthless after its `exp`, and must reach the SDK
   * without passing through storage, a log line, a React prop or the DOM —
   * every one of which is a place it could be read or captured.
   */
  it("keeps the Coach conversation token out of storage, logs and the DOM", () => {
    for (const file of ["components/coach/CoachPreSession.tsx", "components/coach/CoachSession.tsx"]) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/console\.(log|info|warn|error)/);
      expect(source).not.toMatch(/(local|session)Storage/);
      // No React state ever receives the token; a ref holds it instead, so it
      // is not in a props panel, a devtools snapshot or a re-render trace.
      expect(source).not.toMatch(/set[A-Z]\w*\(\s*[\w.]*[Tt]oken/);
    }
    const entry = readFileSync("components/coach/CoachPreSession.tsx", "utf8");
    expect(entry).toContain("const tokenRef = useRef<string | null>(null)");
    // The live screen receives a getter, never the token itself as a prop.
    const live = readFileSync("components/coach/CoachSession.tsx", "utf8");
    expect(live).toContain("getToken: () => string | null");
    expect(live).not.toMatch(/conversationToken:\s*string/);
  });

  it("keeps the Coach webhook gone and the learner routes allowlisted", () => {
    expect(decidePolicy("POST", "/api/speaking/coach/webhook")).toMatchObject({ status: 410, reason: "webhook" });
    expect(decidePolicy("POST", "/api/speaking/coach/session")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/speaking/coach/session/abc-123")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/speaking/coach/mission")).toEqual({ action: "forward" });
    expect(decidePolicy("GET", "/api/speaking/coach/balance")).toEqual({ action: "forward" });
  });

  it("does not ship the leftover Render-calling admin SPA", () => {
    expect(existsSync("public/admin/index.html")).toBe(false);
    const cookies = readFileSync("cookies.html", "utf8");
    expect(cookies).not.toContain("Authenticates administrative dashboard sessions until that console is migrated");
    expect(cookies).toContain("administrative console");
  });
});
