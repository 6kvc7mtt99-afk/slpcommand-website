import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { signupErrorMessage } from "../../lib/api/client";
import { normalizeBackendError, quotaReassurance, userMessageFor } from "../../lib/api/errors";
import { stateFromResult } from "../../lib/server/stateFromResult";

/** Every route and component file, walked once and shared by the guard tests. */
const SOURCE_FILES: string[] = [];
{
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry)) SOURCE_FILES.push(full);
    }
  };
  for (const root of ["app", "components"]) walk(path.join(process.cwd(), root));
}

/**
 * A failure to REACH the backend must never be rendered as a fact about the
 * learner's account, their plan, or the product's own catalog.
 *
 * These are the three shapes that violation took, each fixed at its single
 * root cause rather than at the call sites:
 *
 *   1. Academy routes answered every failure with "that lesson is not in the
 *      curriculum" — a claim about the CATALOG, produced by a network error.
 *   2. `userMessageFor` turned every 401, from any endpoint, into "Incorrect
 *      email or password" — a claim about a PASSWORD, on ~19 screens with no
 *      password field.
 *   3. The signup form reused the login message, so a duplicate address or a
 *      short password was also reported as a wrong password.
 */

describe("stateFromResult — one mapper, four distinct situations", () => {
  const subject = "this lesson";

  it("separates a plan boundary, a missing item, and an outage", () => {
    expect(stateFromResult({ status: 403 }, { subject })).toMatchObject({
      kind: "locked",
      lockReason: "notOnPlan",
    });
    expect(stateFromResult({ status: 404 }, { subject })?.kind).toBe("empty");
    expect(stateFromResult({ status: 500 }, { subject })?.kind).toBe("error");
    // The synthetic status lib/server/backend.ts returns when fetch itself
    // rejects — an unreachable Render dyno, a DNS failure, a timeout.
    expect(stateFromResult({ status: 504 }, { subject })?.kind).toBe("error");
    expect(stateFromResult({ status: 200 }, { subject })).toBeNull();
  });

  it("never says the content is absent when the request failed", () => {
    for (const status of [401, 403, 500, 502, 503, 504]) {
      const state = stateFromResult({ status }, { subject });
      expect(state).not.toBeNull();
      expect(state!.body).not.toMatch(/not in the (curriculum|catalog)/i);
      expect(state!.body).not.toMatch(/could not be found/i);
    }
    // Only a 404 is allowed to say the thing is not there.
    expect(stateFromResult({ status: 404 }, { subject })!.body).toMatch(/could not be found/i);
  });

  it("distinguishes an unreadable 2xx from an empty one", () => {
    const unreadable = stateFromResult({ status: 200 }, { subject, unreadableWhen: true });
    expect(unreadable?.kind).toBe("error");
    expect(unreadable?.body).toMatch(/could not be read/i);

    const empty = stateFromResult({ status: 200 }, { subject: "your history", emptyWhen: true });
    expect(empty?.kind).toBe("empty");
    expect(empty?.body).toMatch(/nothing in your history yet/i);
  });

  it("an outage never claims the learner's record changed", () => {
    expect(stateFromResult({ status: 504 }, { subject })?.detail).toMatch(/nothing about your record has changed/i);
  });
});

/**
 * Guard the fix at the source. These sentences were rendered by route files for
 * any status ≥ 400; if one comes back, it will come back the same way.
 */
describe("no route asserts absent content on a failed request", () => {
  it("scans a real, non-empty set of route and component files", () => {
    expect(SOURCE_FILES.length).toBeGreaterThan(100);
  });

  /**
   * Comments are stripped first. The routes that were fixed explain the old
   * behaviour in a comment that quotes the banned sentence verbatim, and a
   * scanner that matched those would report the documentation as the defect —
   * the same false positive the backend's own guard test hit.
   *
   * Line-based on purpose. The obvious `/\*[\s\S]*?\*\//g` is unsafe here: a
   * line comment that mentions a wildcard path (`/api/billing/*`) opens a false
   * block comment and the lazy match runs to the next real terminator,
   * swallowing arbitrary amounts of real code. That produces silent FALSE
   * NEGATIVES in a guard test — the worst possible failure mode for one.
   */
  const stripLineComment = (line: string): string => {
    let quote: string | null = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quote) {
        if (c === "\\") i++;
        else if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
      if (c === "/" && (line[i + 1] === "/" || line[i + 1] === "*")) return line.slice(0, i);
    }
    return line;
  };

  const stripComments = (src: string): string => {
    const out: string[] = [];
    let inBlock = false;
    for (const line of src.split("\n")) {
      const trimmed = line.trim();
      if (inBlock) {
        if (trimmed.includes("*/")) inBlock = false;
        out.push("");
        continue;
      }
      if (trimmed.startsWith("/*")) {
        if (!trimmed.includes("*/")) inBlock = true;
        out.push("");
        continue;
      }
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) { out.push(""); continue; }
      out.push(stripLineComment(line));
    }
    return out.join("\n");
  };

  it("strips comments without stripping the code around them, and never runs away", () => {
    expect(stripComments("const a = 1; // not in the curriculum")).not.toMatch(/curriculum/);
    expect(stripComments("const a = 1; // note")).toMatch(/const a = 1;/);
    expect(stripComments("/** not in the catalog */\nconst b = 2;")).not.toMatch(/catalog/);
    expect(stripComments("/** doc */\nconst b = 2;")).toMatch(/const b = 2;/);
    expect(stripComments('const u = "https://x.test/a";')).toMatch(/https:\/\/x\.test\/a/);
    const trap = "// see /api/billing/* for details\nconst kept = 1;\nconst alsoKept = 2;";
    expect(stripComments(trap)).toMatch(/const kept = 1;/);
    expect(stripComments(trap)).toMatch(/const alsoKept = 2;/);
  });

  it("does not answer a fetch failure with 'not in the curriculum'", () => {
    const offenders = SOURCE_FILES.filter((file) => {
      // The listening TOPIC route may say it: `topicById` is a local catalog
      // lookup with no network call, so there the sentence is simply true.
      if (file.includes(path.join("academy", "topic"))) return false;
      const code = stripComments(readFileSync(file, "utf8"));
      return /not in the (curriculum|catalog)/i.test(code) && /result\.status|backendJson/.test(code);
    });
    expect(offenders).toEqual([]);
  });
});

describe("401 is an expired session, not a mistyped password", () => {
  it("never tells an authenticated screen the password was wrong", () => {
    const err = normalizeBackendError({ status: 401, body: {}, path: "/api/writing/submit" });
    expect(err.code).toBe("auth");
    const message = userMessageFor(err);
    expect(message).not.toMatch(/password/i);
    expect(message).toMatch(/session has expired/i);
  });

  it("still distinguishes the commercial and transport codes it always did", () => {
    expect(userMessageFor(normalizeBackendError({ status: 402, body: {} }))).toMatch(/allowance/i);
    expect(
      userMessageFor(normalizeBackendError({ status: 403, body: { reason: "feature_not_in_plan" } })),
    ).toMatch(/not available on your current plan/i);
  });
});

describe("signup failures name the real cause", () => {
  it("does not reuse the login sentence on a form with no existing password", () => {
    for (const raw of ["User already registered", "Password should be at least 6 characters", "Unable to validate email address: invalid format"]) {
      expect(signupErrorMessage(400, false, raw)).not.toMatch(/incorrect email or password/i);
    }
  });

  it("maps the backend's Supabase wording onto product sentences", () => {
    expect(signupErrorMessage(400, false, "User already registered")).toMatch(/already has an account/i);
    expect(signupErrorMessage(400, false, "Password should be at least 6 characters")).toMatch(/longer password/i);
    expect(signupErrorMessage(400, false, "Unable to validate email address: invalid format")).toMatch(/doesn’t look valid/i);
    expect(signupErrorMessage(429, false)).toMatch(/too many attempts/i);
    expect(signupErrorMessage(0, true)).toMatch(/unable to connect/i);
    expect(signupErrorMessage(502, false, "network")).toMatch(/unable to connect/i);
  });

  it("never leaks the library's own wording to the learner", () => {
    const shown = signupErrorMessage(400, false, "AuthApiError: signup disabled for this project");
    expect(shown).not.toMatch(/AuthApiError|supabase/i);
    expect(shown).toMatch(/couldn’t create the account/i);
  });
});

/**
 * The one billing sentence the client is allowed to say, and when.
 *
 * "You were not charged." was printed unconditionally on five start/load
 * failures. The client cannot observe billing, so it was a guess — true often
 * enough to feel safe and false exactly when it mattered.
 */
describe("quota reassurance is conditional because the truth is", () => {
  it("speaks only where the backend's auto-refund provably fired", () => {
    for (const status of [400, 402, 403, 404, 409, 422, 429]) {
      expect(quotaReassurance(normalizeBackendError({ status, body: {} }))).toBe("Your allowance was not spent.");
    }
  });

  it("stays silent for 5xx and for a transport failure, where it cannot know", () => {
    for (const status of [500, 502, 503, 504]) {
      expect(quotaReassurance(normalizeBackendError({ status, body: {} }))).toBe("");
    }
    // A rejected fetch: no status at all. Web's proxy also synthesises a 504
    // for this, which is indistinguishable from an upstream 504 — so neither
    // may claim anything.
    expect(quotaReassurance(new TypeError("Failed to fetch"))).toBe("");
    expect(quotaReassurance(undefined)).toBe("");
  });

  it("never leaves a dangling sentence when it says nothing", () => {
    const message = `Couldn’t start the exam. ${quotaReassurance(new TypeError("x"))}`.trim();
    expect(message).toBe("Couldn’t start the exam.");
    expect(message).not.toMatch(/\s$/);
  });
});

describe("no surface claims a charge it cannot observe", () => {
  it("has removed every unconditional 'you were not charged'", () => {
    const offenders = SOURCE_FILES.filter((file) => {
      const code = readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("//"))
        .join("\n");
      return /(were|was) not charged/i.test(code);
    });
    expect(offenders).toEqual([]);
  });
});
