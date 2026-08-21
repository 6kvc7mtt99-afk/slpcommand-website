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
      plan: { key: "free", name: "SLP Command Free", description: "Core practice with weekly limits." },
      features: [
        { key: "reading_practice", name: "Reading practice", description: "One passage, one question.", enabled: true, quota: { period: "weekly", limit: 10, remaining: 4 } },
        { key: "listening_practice", name: "Listening practice", description: "One clip, one question.", enabled: true, quota: { period: "weekly", limit: 10, remaining: 4 } },
        { key: "writing_ai_feedback", enabled: true, quota: { period: "monthly", limit: 3, remaining: 2 } },
        { key: "speaking_ai_feedback", enabled: true, quota: { period: "monthly", limit: 3, remaining: 2 } },
        { key: "reading_exam_simulation", name: "Reading exam simulation", enabled: true, quota: { period: "monthly", limit: 1, remaining: 1 } },
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
  if (url.pathname === "/api/listening/slp/next") {
    res.end(JSON.stringify({
      source: "cloud",
      mode: "training",
      examStyle: { questionPerAudio: 1, showTranscriptToStudent: false, optionsPerQuestion: 4, targetLevel: 3 },
      listening: {
        id: "L1",
        title: "Sitrep",
        audioUrl: "https://example.com/clip.mp3",
        topic: "operations",
        speechType: "briefing",
        difficulty: 3,
        estimatedLevel: 3,
        accent: "standard",
        hasBackgroundNoise: false,
      },
      question: {
        id: "q1",
        level: 3,
        skill: "gist",
        question: "What did the speaker ask for?",
        options: ["Map", "Water", "Radio", "Light"],
      },
    }));
    return;
  }
  if (url.pathname === "/api/listening/slp/answer" && req.method === "POST") {
    res.end(JSON.stringify({ ok: true, isCorrect: true, correctIndex: 1, explanation: "The speaker asked for water." }));
    return;
  }
  if (url.pathname === "/api/writing/prompts/next") {
    // Shape matches the real backend response, verified on the deployed
    // preview: top-level {ok, source, prompt:{id, promptText, ...}}, not the
    // flat {writingPromptId, prompt} shape this fixture used to send. The old
    // shape happened to satisfy the decoder's old (wrong) alias list, so this
    // fixture was hiding the real contract mismatch instead of catching it.
    res.end(JSON.stringify({
      ok: true,
      source: "writing_prompt_library",
      prompt: {
        id: "wp-1",
        title: "Orders",
        promptText: "Write a short sitrep.",
        level2Task: null,
        level3Task: null,
        audience: "your section commander",
        timeLimitMinutes: 35,
        levelBand: "3",
        wordTarget: 120,
        guidance: { suggestedStructure: ["Issue", "Action"], practiceTips: ["Be specific."] },
        checklist: ["I said what happened", "I said what is needed"],
      },
    }));
    return;
  }
  if (url.pathname === "/api/writing/submit" && req.method === "POST") {
    // No fixture existed for this endpoint at all, so the correction/result
    // screen was never exercised in E2E. Paragraph breaks are real newlines,
    // matching the shape confirmed against the deployed preview, to catch a
    // regression of the white-space collapse bug this fixture accompanies.
    res.end(JSON.stringify({
      writingAttemptId: "wa-1",
      taskFulfilment: "You covered all three required points. The recommendation is specific and actionable.",
      correction:
        "The email is clear and appropriately formal for the audience. Structure follows the standard problem-cause-recommendation pattern expected at this level.\n\n" +
        "One recurring issue: several sentences run past 25 words, which makes the causal relationship between the hazard and the recommendation harder to follow on a single reading. Splitting the second paragraph would raise this closer to a Level 3 register.\n\n" +
        "Vocabulary and tense use are accurate throughout. No corrections needed there.",
      mode: "practice",
    }));
    return;
  }
  if (url.pathname === "/api/profile") {
    // Deliberately "2" while /api/writing/learning-state's own targetLevel
    // fixture below stays "3" — this is the real live discrepancy Phase 7
    // found (profile said 2, learning-state said 3 for the same account).
    // Writing Intelligence must read the learner's real target from here,
    // not from learning-state's own field.
    res.end(JSON.stringify({ target_level: "2" }));
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
    res.end(JSON.stringify({ lesson: {
      id: "rl-1", title: "Inference in orders", module: "Core", unit: "Inference", level: "3",
      learningObjective: "Spot implied meaning in an operational order without it being stated outright.",
      estimatedMinutes: 12, difficulty: "moderate",
      conceptExplanation: "An order rarely spells out its full intent. The answer is what follows from the stated facts, not a restatement of them — you are looking for the one conclusion the wording forces, not any conclusion it merely allows.",
      strategy: "Ask 'so what does this require of me?' after every sentence, not just at the end.",
      commonMisconception: "Treating the most literal restatement as the safest answer — at Level 3 the literal option is usually the distractor.",
      successCriteria: ["Name the implication in one sentence.", "Trace it back to the exact clause that forces it.", "Reject options that are true but not implied."],
      reflectionQuestions: ["What single word in the order carried the implication?", "Could the order support a different implication? Why not?"],
      competencyId: "c1", competencyTitle: "Reading between the lines",
    } }));
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
    res.end(JSON.stringify({
      coach: { headline: "Rewrite the opening", detail: "Your last three openings buried the claim in the second sentence." },
      todaysFocus: { title: "Openings", reasons: ["Two of your last three submissions lost task-fulfilment points on the opening line.", "SLP3 examiners weight the first sentence heavily — it sets the claim they grade against."] },
      lesson: { id: "wl-1", title: "Openings", reason: "weak openings" },
      readiness: { mastered: 0, emerging: 1, weak: 1, untested: 4 },
      sessions: [
        { id: "s1", title: "Warm-up: claim in one sentence", subtitle: "Rewrite three prompts' opening lines only.", minutes: 8 },
        { id: "s2", title: "Full task under time", subtitle: "One complete SLP3 task, timed.", minutes: 35 },
        { id: "s3", title: "Review the examiner's report", subtitle: "Read the correction against your own draft.", minutes: 10 },
      ],
    }));
    return;
  }
  if (url.pathname === "/api/writing/learning-state") {
    // Shape verified live against production (writing_learning_state_v3 /
    // writing_competencies_v3) — field names and nesting match the real
    // response exactly, values trimmed for a readable fixture.
    res.end(JSON.stringify({
      version: "writing_learning_state_v3",
      modelVersion: "writing_competencies_v3",
      targetLevel: "3",
      attempts: 14,
      hasEvidence: true,
      summary: { mastered: 37, emerging: 0, weak: 4, untested: 4, blocked: 6, total: 51 },
      blockingPromotion: [
        {
          id: "W1.1", title: "Parse the task: identify every required move", branch: "W1", band: "1+",
          discriminator: null, state: "weak", demonstrations: 14,
          evidence: { examples: [{ text: "Level 3 task is underdeveloped", severity: "critical", attemptId: "95095bd1" }] },
        },
        {
          id: "W4.3", title: "Cohesion within a paragraph", branch: "W4", band: "2",
          discriminator: null, state: "weak", demonstrations: 14,
          evidence: { examples: [{ text: "Limited use of advanced connectors.", severity: "recurrent", attemptId: "10a06f0e" }] },
        },
      ],
      nextTraining: [
        { id: "W1.1", title: "Parse the task: identify every required move", state: "weak", band: "1+", why: "Your own errors point here: task." },
      ],
      levelThree: [
        { discriminator: "D1", label: "Answer objections", status: "absent", prerequisitesOutstanding: ["W1.1"] },
      ],
    }));
    return;
  }
  if (url.pathname === "/api/writing/academy/lessons") {
    res.end(JSON.stringify({
      coverage: {
        version: "writing_academy_v3",
        totalLessons: 3,
        modules: [
          { module: "self_editing", title: "Self-Editing and Revision", lessons: 1 },
          { module: "level_three_gates", title: "The Four Gates to Level 3", lessons: 2 },
        ],
      },
      lessons: [
        { id: "ACA-W3.6", module: "self_editing", title: "Finding What You Can't See", level: "2+", competencyId: "W3.6", estimatedMinutes: 12 },
        { id: "wl-1", module: "level_three_gates", title: "Openings", level: "3", competencyId: "W1.1", estimatedMinutes: 15 },
        { id: "ACA-W4.3", module: "level_three_gates", title: "Making Paragraphs Cohere", level: "3", competencyId: "W4.3", estimatedMinutes: 14 },
      ],
    }));
    return;
  }
  if (url.pathname === "/api/writing/academy/lesson/wl-1") {
    res.end(JSON.stringify({ lesson: {
      id: "wl-1", title: "Openings", module: "Structure", level: "3",
      learningObjective: "State the issue first, in one sentence an examiner can grade against.",
      estimatedMinutes: 15, difficulty: "moderate",
      conceptExplanation: "Your opening line is the claim the rest of the text has to support. An examiner reads it before anything else and forms an expectation from it — bury the claim in sentence two and everything that follows is graded against the wrong expectation.",
      strategy: "Write the claim first, in one plain sentence, before you write anything else — then build the paragraph around it.",
      commonMisconception: "Believing a longer, more elaborate opening sounds more competent — examiners mark clarity, not length.",
      successCriteria: ["The claim appears in the first sentence.", "A reader could state your position from that sentence alone.", "Nothing before it needs to be read first."],
      reflectionQuestions: ["Could your opening sentence stand alone as a summary of your position?"],
      competencyId: "c2", competencyTitle: "Task structure",
    } }));
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
  if (url.pathname === "/api/speaking/coach/readiness") {
    res.end(JSON.stringify({ ok: true, coachEnabled: true, providerConfigured: true, status: "ready" }));
    return;
  }
  if (url.pathname === "/api/speaking/coach/mission") {
    res.end(JSON.stringify({
      ok: true,
      mission: {
        objective: "Spike only",
        objectiveSource: "spike",
        rationale: "Prove the browser SDK.",
        estimatedMinutes: 1,
        eligibility: "eligible",
        blockedReason: null,
      },
    }));
    return;
  }
  if (url.pathname === "/api/speaking/coach/balance") {
    res.end(JSON.stringify({ ok: true, subscriptionSecs: 60, topupSecs: 0, totalSecs: 60 }));
    return;
  }
  if (url.pathname === "/api/speaking/coach/consent" && req.method === "POST") {
    res.end(JSON.stringify({ ok: true, consentType: "granted" }));
    return;
  }
  if (url.pathname === "/api/speaking/coach/session" && req.method === "POST") {
    res.end(JSON.stringify({
      ok: true,
      sessionId: "sess-spike-1",
      budgetSecs: 60,
      conversationToken: "spike-fake-token-do-not-render",
      conversationTokenExpiresAt: "2026-08-16T00:10:00Z",
      conversationId: "conv-spike-1",
      dynamicVariables: { session_objective: "Spike only", session_ref: "ref-spike-1", minutes_budget: "1" },
      objective: "Spike only",
    }));
    return;
  }
  if (url.pathname === "/api/speaking/coach/session/sess-spike-1") {
    res.end(JSON.stringify({ ok: true, session: { id: "sess-spike-1", status: "completed", evaluation_status: "completed", consumed_secs: 12, result: null } }));
    return;
  }
  if (url.pathname === "/api/support/conversations" && req.method === "POST") {
    res.statusCode = 201;
    res.end(JSON.stringify({ ok: true, conversation: { id: "conv-support-1", client: "web", status: "open" } }));
    return;
  }
  if (url.pathname === "/api/support/conversations/conv-support-1/messages" && req.method === "POST") {
    res.end(JSON.stringify({
      ok: true,
      conversationId: "conv-support-1",
      message: { id: "m1", role: "assistant", content: "Listening Practice serves one live item at a time.", phase: "answered" },
      phase: "answered",
      toolsUsed: ["search_knowledge"],
      case: null,
    }));
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
