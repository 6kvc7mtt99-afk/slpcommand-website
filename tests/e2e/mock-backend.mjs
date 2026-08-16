import http from "node:http";

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  res.setHeader("content-type", "application/json");
  if (url.pathname === "/health" || url.pathname === "/api/health") {
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (url.pathname === "/api/auth/refresh") {
    res.end(JSON.stringify({ accessToken: "at", refreshToken: "rt" }));
    return;
  }
  if (url.pathname === "/api/feature-flags") {
    res.end(JSON.stringify({ reading_enabled: true, listening_enabled: true, writing_enabled: true, speaking_enabled: true, academy_enabled: true }));
    return;
  }
  if (url.pathname === "/api/entitlements") {
    res.end(JSON.stringify({
      ok: true,
      plan: { key: "free", name: "Free" },
      features: [
        { key: "reading_practice", enabled: true, quota: { period: "weekly", limit: 10, remaining: 4 } },
        { key: "listening_practice", enabled: true, quota: { period: "weekly", limit: 10, remaining: 4 } },
        { key: "writing_ai_feedback", enabled: true, quota: { period: "monthly", limit: 3, remaining: 2 } },
        { key: "speaking_ai_feedback", enabled: true, quota: { period: "monthly", limit: 3, remaining: 2 } },
        { key: "reading_exam_simulation", enabled: true, quota: { period: "monthly", limit: 1, remaining: 1 } },
        { key: "listening_exam_simulation", enabled: true, quota: { period: "monthly", limit: 1, remaining: 1 } },
        { key: "academy_access", enabled: true },
        { key: "intelligence_dashboard", enabled: true },
      ],
    }));
    return;
  }
  if (url.pathname === "/api/progress") {
    res.end(JSON.stringify({ overall: { level: 2.2, available: true, confidence: "medium" }, skills: { reading: { level: 2.4, available: true, confidence_label: "Good" }, listening: { available: true, level: 2.1 }, writing: { available: false }, speaking: { available: false } }, proficiencyEngine: { effectiveLevel: 2.2 } }));
    return;
  }
  if (url.pathname === "/api/session/today") {
    res.end(JSON.stringify({ mission: { headline: "Recover listening", reason: "Yesterday slipped.", coachLine: { headline: "Short clips", why: "Accuracy", focus: "gist" } }, session: { blocks: [{ skill: "listening", minutes: 25, posture: "recovering", why: "Accuracy dipped", focus: "gist" }], difficulty: { level: "balanced" } }, expectedOutcome: { certainties: [{ skill: "listening", text: "You will hear one more clip." }], passProbability: 0.72 } }));
    return;
  }
  if (url.pathname === "/api/activity/streak") {
    res.end(JSON.stringify({ current: 3, longest: 5 }));
    return;
  }
  if (url.pathname === "/api/activity/achievements") {
    res.end(JSON.stringify({ items: [{ title: "First session" }] }));
    return;
  }
  if (url.pathname === "/api/activity/recent") {
    res.end(JSON.stringify({ items: [{ title: "Listening practice", skill: "listening" }] }));
    return;
  }
  if (url.pathname === "/api/reading/passage") {
    res.end(JSON.stringify({ readingTextId: "rt-1", title: "Orders", text: "Report to the briefing room at 0600.", genreDescriptor: "military", difficulty: "B2", questions: [{ questionId: "q1", prompt: "Where should they report?", options: ["Mess", "Briefing room", "Gate", "Hangar"], correctIndex: 1, explanation: "The text names the briefing room." }] }));
    return;
  }
  if (url.pathname === "/api/reading/answer") {
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (url.pathname === "/api/profile") {
    res.end(JSON.stringify({ target_level: "3" }));
    return;
  }
  if (url.pathname === "/api/reading/academy/home" && req.method === "POST") {
    res.end(JSON.stringify({ focus: { reason: { headline: "Recover inference", detail: "Evidence slipped." }, lesson: { id: "rl-1", title: "Inference in orders", learningObjective: "Spot implied meaning." } }, state: { summary: { mastered: 1, emerging: 1, weak: 1, untested: 2, blocked: 0 } }, curriculum: [{ id: "u1", title: "Core", lessons: [{ id: "rl-1", title: "Inference in orders" }] }] }));
    return;
  }
  if (url.pathname === "/api/reading/academy/map" && req.method === "POST") {
    res.end(JSON.stringify({ branches: [{ id: "b1", name: "Inference", competencies: [{ id: "c1", name: "Implication", state: "emerging", lessonId: "rl-1" }] }] }));
    return;
  }
  if (url.pathname === "/api/reading/academy/lesson/rl-1") {
    res.end(JSON.stringify({ lesson: { id: "rl-1", title: "Inference in orders", learningObjective: "Spot implied meaning.", conceptExplanation: "The answer is what follows.", strategy: "Ask so what.", successCriteria: ["Name the implication"] } }));
    return;
  }
  if (url.pathname === "/api/reading/intelligence/readiness") {
    res.end(JSON.stringify({ readiness: 42, label: "Building foundation", milestone: "Keep going", totalAttempts: 8, status: "building_profile", scoreBars: [] }));
    return;
  }
  if (url.pathname === "/api/reading/intelligence/missions") {
    res.end(JSON.stringify({ missions: [{ title: "Read one more order", description: "The Academy will pick the class.", reason: "thin evidence" }] }));
    return;
  }
  if (url.pathname === "/api/listening/academy/home") {
    res.end(JSON.stringify({ decision: { hasEvidence: true, nextStep: "train", target: { key: "factual_detail" }, reason: { headline: "Start with details", detail: "Literal facts first." } }, counts: { mastered: 0, emerging: 1, weak: 0, untested: 4, blocked: 0 } }));
    return;
  }
  if (url.pathname.startsWith("/api/listening/academy/skill/")) {
    res.end(JSON.stringify({ skill: { key: "factual_detail", label: "Specific Details", state: "emerging", description: "Exact values." }, reason: "thin evidence" }));
    return;
  }
  if (url.pathname === "/api/listening/academy/map") {
    res.end(JSON.stringify({ skills: [{ key: "factual_detail", label: "Specific Details", state: "emerging" }] }));
    return;
  }
  if (url.pathname === "/api/listening/intelligence/readiness") {
    res.end(JSON.stringify({ readiness: 38, label: "Building foundation", totalAttempts: 6, status: "building_profile" }));
    return;
  }
  if (url.pathname === "/api/listening/intelligence/weakness-profile") {
    res.end(JSON.stringify({ weaknessProfile: [{ key: "inference", label: "Inference", attempts: 3, reportable: false, severity: "high" }] }));
    return;
  }
  if (url.pathname === "/api/listening/intelligence/missions") {
    res.end(JSON.stringify({ missions: [{ title: "Train inference", targetSkill: "inference", reason: "weak" }] }));
    return;
  }
  if (url.pathname === "/api/listening/intelligence/mastery") {
    res.end(JSON.stringify({ summary: { mastered: 0, developing: 1, needsWork: 1 }, skills: [{ key: "inference", label: "Inference", status: "developing", trend: "improving", reportable: false }] }));
    return;
  }
  if (url.pathname === "/api/writing/academy/home" && req.method === "POST") {
    res.end(JSON.stringify({ coach: { headline: "Rewrite the opening", detail: "Task coverage first." }, todaysFocus: { title: "Openings" }, lesson: { id: "wl-1", title: "Openings", reason: "weak openings" }, readiness: { mastered: 0, emerging: 1, weak: 1, untested: 4 }, sessions: [] }));
    return;
  }
  if (url.pathname === "/api/writing/academy/lesson/wl-1") {
    res.end(JSON.stringify({ lesson: { id: "wl-1", title: "Openings", learningObjective: "State the issue first.", conceptExplanation: "Do not delay the claim." } }));
    return;
  }
  if (url.pathname === "/api/writing/orchestrator/next" && req.method === "POST") {
    res.end(JSON.stringify({ coach: { headline: "Fix the opening", detail: "The orchestrator chose this." }, academy: { lesson: { id: "wl-1", title: "Openings" }, reason: "coverage" } }));
    return;
  }
  if (url.pathname === "/api/speaking/evaluate" && req.method === "POST") {
    res.end(JSON.stringify({
      attempt_id: "spk-1",
      created_at: "2026-08-16T00:00:00Z",
      transcript: "Unit ready.",
      target_level: "3",
      prompt_title: "Readiness Status Report",
      mode: "practice",
      rating: {
        credited: true,
        level_attempted: "3",
        limiting_criterion: null,
        failed_on: [],
        criteria: {
          content: { met: true, evidence: "ready", note: "" },
          tasks: { met: true, evidence: "", note: "" },
          accuracy: { met: true, evidence: "", note: "" },
          textProduced: { met: true, evidence: "", note: "" },
        },
        band: null,
        confidence: null,
        ratable: true,
      },
    }));
    return;
  }
  if (url.pathname === "/api/speaking/history") {
    res.end(JSON.stringify({ items: [{ id: "spk-1", prompt_title: "Readiness Status Report", mode: "practice", created_at: "2026-08-16T00:00:00Z", stanag_band: null }] }));
    return;
  }
  if (url.pathname === "/api/writing/intelligence/transform" && req.method === "POST") {
    res.end(JSON.stringify({ original: "The unit moved.", upgraded: "The unit was redirected after the bridge failed.", explanation: "Passive + cause.", featuresAdded: ["passive"], memorisePhrases: ["was redirected"] }));
    return;
  }
  if (url.pathname.startsWith("/api/admin/")) {
    const auth = req.headers.authorization ?? "";
    if (!auth.includes("admin-access")) {
      res.statusCode = 403;
      res.end(JSON.stringify({ error: "Admin access required" }));
      return;
    }
    if (url.pathname === "/api/admin/metrics/users") {
      res.end(JSON.stringify({ total: 12, activeToday: 3, active7d: 7, active30d: 10, newRegistrations: { d7: 1, d30: 4 } }));
      return;
    }
    if (url.pathname === "/api/admin/metrics/learning") {
      res.end(JSON.stringify({ attempts: { listening: 4, reading: 8, writing: 2, speaking: 1 }, examsStarted: 2, examsCompleted: 1 }));
      return;
    }
    if (url.pathname === "/api/admin/metrics/usage") {
      res.end(JSON.stringify({ mostUsedModule: "reading", last30dAttemptsByModule: { listening: 4, reading: 8, writing: 2, speaking: 1 } }));
      return;
    }
    if (url.pathname === "/api/admin/metrics/health") {
      res.end(JSON.stringify({ status5xx: 0, status4xx: 1, jwtFailures: 0, rateLimitHits: 0, total: 40, recentErrors: [] }));
      return;
    }
    if (url.pathname === "/api/admin/metrics/reports") {
      res.end(JSON.stringify({ open: 0, resolved: 1, latest: [] }));
      return;
    }
    if (url.pathname === "/api/admin/metrics/retention") {
      res.end(JSON.stringify({ d1: { pct: 40 }, d7: { pct: 20 }, d30: { pct: 10 }, segments: { power: 1, engaged: 2, churnRisk: 1, inactive: 8 } }));
      return;
    }
    if (url.pathname === "/api/admin/metrics/system-health") {
      res.end(JSON.stringify({ mode: "healthy", backend: { uptimeSeconds: 100, errorRatePct: 0 }, dependencies: { supabase: { ok: true } } }));
      return;
    }
    if (url.pathname === "/api/admin/feature-flags") {
      res.end(JSON.stringify({ flags: [{ key: "home_v3_enabled", description: "Home v3", enabled: false, updated_at: "2026-08-01T00:00:00Z" }] }));
      return;
    }
    if (url.pathname.startsWith("/api/admin/feature-flags/") && req.method === "PATCH") {
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url.pathname === "/api/admin/audit-logs") {
      res.end(JSON.stringify({ logs: [] }));
      return;
    }
    if (url.pathname === "/api/admin/v2/overview") {
      res.end(JSON.stringify({
        product: { headline: { summary: "Engine is quiet.", measurementsHeld: 3 }, bySkill: { reading: { mode: "shadow_v2", modeExplained: "Shadow only.", learnersMeasured: 3, learnersOnPreviousMethod: 0, confidence: { reliable: 1, fairly_reliable: 1, limited_evidence: 1, out_of_date: 0 }, freshness: { fresh: 2, ageing: 1, stale: 0 } } } },
        engineering: { promotionGate: { passed: 1, total: 1, eligible: false, criteria: [] }, bySkill: { reading: { detail: [] } }, rebuild: { covered: 1, total: 1, gaps: [] } },
        health: { lights: [{ id: "integrity", status: "green", detail: "ok" }] },
        calibration: { counts: { set: 1 }, parameters: [] },
      }));
      return;
    }
    if (url.pathname === "/api/admin/v2/compare") {
      if (url.searchParams.get("format") === "csv") {
        res.setHeader("content-type", "text/csv; charset=utf-8");
        res.end("skill,legacy,v2,delta\nreading,2.0,2.1,0.1\n");
        return;
      }
      res.end(JSON.stringify({ rows: [], summary: { n: 0, worst: 0, median: 0, overNoticeable: 0, noticeableThreshold: 0.2 } }));
      return;
    }
    if (url.pathname === "/api/admin/v2/startup") {
      res.end(JSON.stringify({ valid: true, rawPresent: false, rawValue: null, normalizedValue: "shadow_v2", configurationHash: "abc", startedAt: "2026-08-16T00:00:00Z", skills: [], warnings: [], logLines: ["boot"] }));
      return;
    }
    if (url.pathname === "/api/admin/v2/recovery") {
      res.end(JSON.stringify({ integrity: "green", explanation: "Rebuildable.", coverage: { covered: 1, total: 1 }, corrupt: 0, rows: [] }));
      return;
    }
    if (url.pathname === "/api/admin/v2/transition") {
      res.end(JSON.stringify({ active: false, census: { legacy: 0, preview: 0, switched: 0, settled: 1, noticeable: 0, notNoticeable: 1 }, rows: [] }));
      return;
    }
    if (url.pathname === "/api/admin/v2/corpus") {
      res.end(JSON.stringify({ pools: { reading_practice: { total: 10, byLevel: { "2": 5, "3": 5 }, coverage: { expectedLevels: true, complete: true }, utilisation: { utilisationPct: 0.4 }, exposure: { neverUsed: 2, heavilyUsed: 1, p90Uses: 4 }, ageing: { staleDays: 365, notUsedInAYear: 1 }, discrimination: { why: "not measured" } } } }));
      return;
    }
    if (url.pathname === "/api/admin/trainer-pipeline") {
      res.end(JSON.stringify({ count: 1, learners: [{ userId: "user-1", skills: ["reading"], observations: 4, lastEventAt: "2026-08-01T00:00:00Z" }] }));
      return;
    }
    if (url.pathname === "/api/admin/proficiency/dashboard") {
      res.end(JSON.stringify({ __peError: "not in mock" }));
      return;
    }
    if (url.pathname === "/api/admin/proficiency/mode-status") {
      res.end(JSON.stringify({ mode: "shadow_v2", proficiencyV2Active: true, shadowFlagEnabled: false, rolloutPercent: 0, validation: { status: "PASS" }, algorithmVersion: "v2", mappingVersion: "m1", legacyFallbackAvailable: true }));
      return;
    }
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(process.env.MOCK_BACKEND_PORT || 3999, "127.0.0.1", () => {
  console.log("mock backend ready");
});
