import http from "node:http";
import crypto from "node:crypto";

/** Reads and JSON-parses a request body, then invokes cb — the only POST
 * routes below that need to read what was actually sent (groups/invites). */
function withBody(req, cb) {
  let raw = "";
  req.on("data", (chunk) => { raw += chunk; });
  req.on("end", () => {
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
    cb(body);
  });
}

// FASE TEACHER-GROUPS-001 — in-memory, per-process state so the E2E mock can
// round-trip a real create → list and create-invite → accept flow, the same
// discipline as the rest of this fixture (real requests, real responses, no
// production data).
// FASE PLATFORM-GROUPS-001 — TWO groups, because a single one cannot show a
// MOVE, and moving a student between cohorts is the workflow D3 exists for.
const MOCK_GROUPS = [
  { id: "group-1", name: "Morning cohort", created_at: "2026-01-01T00:00:00Z" },
  { id: "group-2", name: "Evening cohort", created_at: "2026-01-02T00:00:00Z" },
];
const MOCK_INVITES = new Map();

// FASE PLATFORM-MAIL-001 — a FAKE MAIL TRANSPORT.
//
// Nothing here can reach a real provider: there is no key, no fetch, no
// network. Messages are appended to an array the E2E can read back, which is
// what lets the workflow assert the RECIPIENT, the ORGANIZATION and the
// TOKEN URL rather than just "the button said Sent".
//
// `failNext` is how provider failure becomes testable without pretending a
// network exists. A test sets it, the next send is refused, and the UI has to
// show the created-but-unsent state honestly.
const MOCK_MAILBOX = [];
let mailFailNext = null;

/** Invitations, keyed by id, with the delivery lifecycle D4 added. */
const MOCK_INVITE_ROWS = new Map();
let inviteSeq = 0;

const RESEND_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_SENDS_PER_INVITE = 5;

function inviteView(row) {
  const now = Date.now();
  const expired = new Date(row.expiresAt).getTime() < now;
  const cooling = row.lastSentAt && now - new Date(row.lastSentAt).getTime() < RESEND_COOLDOWN_MS;
  return {
    id: row.id, role: row.role, groupId: row.groupId ?? null, email: row.email ?? null,
    status: row.status === "pending" && expired ? "expired" : row.status,
    delivery: {
      status: row.deliveryStatus, error: row.deliveryError ?? null,
      lastSentAt: row.lastSentAt ?? null, sendCount: row.sendCount,
      canResend: Boolean(row.email) && row.status === "pending" && !expired
        && row.sendCount < MAX_SENDS_PER_INVITE && !cooling,
    },
    expiresAt: row.expiresAt, createdAt: row.createdAt,
    acceptedAt: row.acceptedAt ?? null, invitedBy: "teacher-1", acceptedBy: row.acceptedBy ?? null,
  };
}

/** Models deliverInvitation: attempt, then record the truth either way. */
function fakeDeliver(row, token, organizationName) {
  row.sendCount += 1;
  row.lastSentAt = new Date().toISOString();
  if (mailFailNext) {
    const { retriable, error } = mailFailNext;
    mailFailNext = null;
    row.deliveryStatus = "failed";
    row.deliveryError = error;
    return { status: "failed", retriable, error };
  }
  row.deliveryStatus = "sent";
  row.deliveryError = null;
  MOCK_MAILBOX.push({
    to: row.email,
    subject: `You have been invited to ${organizationName} on SLP Command`,
    organizationName,
    url: `http://localhost:3000/invite/accept?token=${token}`,
    token,
    role: row.role,
  });
  return { status: "sent", retriable: false };
}

// FASE PLATFORM-GROUPS-001 — who is in which cohort, held per process so an
// assignment made by one request is visible to the next. A mock that accepted
// the PATCH and then kept answering with the old group would let an E2E test
// pass while the feature did nothing, which is the specific failure mode this
// state exists to prevent.
const MOCK_MEMBER_GROUPS = new Map([["student-e2e", "group-1"]]);

/** Live count, derived — never a stored number that can disagree with the map. */
function groupsWithCounts() {
  return MOCK_GROUPS.map((g) => ({
    ...g,
    studentCount: [...MOCK_MEMBER_GROUPS.values()].filter((v) => v === g.id).length,
  }));
}
function unassignedCount() {
  return [...MOCK_MEMBER_GROUPS.values()].filter((v) => v === null).length;
}

const COACH_PLAN = {
  version: "1.1.0",
  workflowVersion: "1.0.0",
  sessionMode: "academy",
  expectedMinutes: 1,
  maxSameScenarioExchanges: 3,
  phases: [
    { id: "orientation", label: "Orientation", goal: "Name today's objective.", targetSecs: 20 },
    { id: "guided_practice", label: "Practice", goal: "Work the objective directly.", targetSecs: 25 },
    { id: "close", label: "Close", goal: "End on the learner's turn.", targetSecs: 15 },
  ],
  droppedPhases: ["transfer"],
};

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
        actionType: "SPEAKING_COACH",
        destination: "coach",
        objective: "Sustain an argument under pressure",
        objectiveSource: "evidence",
        rationale: "Your last three recordings lost the claim when challenged.",
        plan: COACH_PLAN,
        estimatedMinutes: 1,
        availableMinutes: 12,
        includedMinutes: 10,
        purchasedMinutes: 2,
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
      dynamicVariables: { session_objective: "Sustain an argument under pressure", session_ref: "ref-spike-1", minutes_budget: "1" },
      objective: "Sustain an argument under pressure",
      sessionPlan: COACH_PLAN,
    }));
    return;
  }
  if (url.pathname === "/api/speaking/coach/session/sess-spike-1") {
    res.end(JSON.stringify({
      ok: true,
      session: {
        id: "sess-spike-1",
        status: "completed",
        evaluation_status: "completed",
        consumed_secs: 12,
        result: {
          workedOn: "Sustain an argument under pressure",
          ratable: true,
          headline: "Solid work — this session counts toward your evidence.",
          wentWell: ["content", "tasks"],
          keepWorkingOn: "accuracy",
          strengths: [{ criterion: "content", note: "Wide range of ideas.", evidence: "the logistics chain was the real problem" }],
          growthAreas: [{ criterion: "accuracy", note: "Past-tense slips under pressure.", evidence: null }],
          functionsPracticed: ["Describing", "Explaining"],
          functionsToTry: ["Hypothesising"],
          nextObjective: "Hypothesise about consequences",
          nextRationale: "You did not reach for it once today.",
          professorNote: "Keep the claim in the first sentence.",
          metrics: { learnerTurnCount: 18, learnerWordCount: 640 },
        },
      },
    }));
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
  // FASE TEACHER-WEB-001 — one fake organization, one fake student, enough
  // for a real rendered-page a11y/visual check of every Teacher screen
  // without touching production or inventing a real academy.
  const TEACHER_ORG = "org-e2e";
  const TEACHER_STUDENT = "student-e2e";
  // Distinguishes callers by the exact access-token string the test fixture
  // sent — "test-access-teacher" is the only one with a real membership.
  // Anyone else (a real student session, or no matching fixture at all)
  // gets zero memberships, exactly like a real signed-in learner who has
  // never been added to any organization.
  const teacherAuth = req.headers.authorization ?? "";
  // FASE PLATFORM-ENTERPRISE-001 — two staff fixtures, not one. The whole
  // point of the permission layer is that an owner and a teacher of the SAME
  // organization see different things, and a single fixture could not show
  // that. "test-access-owner" is checked FIRST because it also contains
  // "test-access", which the plain learner fixture uses.
  const isOwnerCaller = teacherAuth.includes("test-access-owner");
  const isTeacherCaller = isOwnerCaller || teacherAuth.includes("test-access-teacher");
  const callerRole = isOwnerCaller ? "owner" : "teacher";
  if (url.pathname === "/api/teacher/me") {
    res.end(JSON.stringify({
      ok: true,
      memberships: isTeacherCaller
        ? [{ organizationId: TEACHER_ORG, role: callerRole, organizationName: "SLP Command E2E Academy" }]
        : [],
    }));
    return;
  }
  if (url.pathname.startsWith("/api/teacher/organizations/") && !isTeacherCaller) {
    res.statusCode = 403;
    res.end(JSON.stringify({ error: "Teacher access required" }));
    return;
  }
  if (url.pathname === `/api/teacher/organizations/${TEACHER_ORG}/students`) {
    // PLATFORM-GROUPS-001 — the roster carries NAME and EMAIL now. It used to
    // return the id alone and the Web printed it, so a teacher saw a UUID per
    // row. It also honours ?groupId=, including the literal "unassigned",
    // because the group detail page and the unassigned view are both built on
    // exactly this one endpoint.
    const current = MOCK_MEMBER_GROUPS.get(TEACHER_STUDENT) ?? null;
    const filter = url.searchParams.get("groupId");
    const matches =
      filter === null ? true : filter === "unassigned" ? current === null : current === filter;
    const students = matches
      ? [{
          studentId: TEACHER_STUDENT,
          name: "E2E Student",
          email: "student@example.com",
          memberSince: "2026-01-15T00:00:00Z",
          groupId: current,
          groupName: current ? (MOCK_GROUPS.find((g) => g.id === current)?.name ?? null) : null,
          targetLevel: "3", lastActivityAt: "2026-08-20T09:00:00Z", lastActivityDate: "2026-08-20",
        }]
      : [];
    res.end(JSON.stringify({ ok: true, total: students.length, students }));
    return;
  }
  if (url.pathname === `/api/teacher/organizations/${TEACHER_ORG}/students/${TEACHER_STUDENT}`) {
    res.end(JSON.stringify({
      ok: true,
      student: { studentId: TEACHER_STUDENT, memberSince: "2026-01-15T00:00:00Z", targetLevel: "3", accountCreatedAt: "2026-01-10T00:00:00Z" },
    }));
    return;
  }
  if (url.pathname === `/api/teacher/organizations/${TEACHER_ORG}/students/${TEACHER_STUDENT}/activity`) {
    res.end(JSON.stringify({
      ok: true, studentId: TEACHER_STUDENT, days: 30,
      activity: [{
        activity_date: "2026-08-20", reading_practice_question_count: 12, reading_exam_count: 1,
        listening_practice_question_count: 3, listening_exam_count: 0, writing_submission_count: 2,
        speaking_evaluation_count: 1, academy_completion_count: 4, skills_trained_count: 3,
        qualifying_activity_count: 5, first_activity_at: "2026-08-20T08:00:00Z", last_activity_at: "2026-08-20T09:00:00Z",
      }],
    }));
    return;
  }
  if (url.pathname === `/api/teacher/organizations/${TEACHER_ORG}/students/${TEACHER_STUDENT}/writing`) {
    res.end(JSON.stringify({
      ok: true, studentId: TEACHER_STUDENT,
      attempts: [{
        id: "w-1", submitted_at: "2026-08-19T10:00:00Z", mode: "practice", task_type: "essay",
        topic: "Describe a recent training exercise", target_level: "3", estimated_level: "2+",
        overall_score: 78, task_score: 80, content_score: 76, language_score: 78,
        strengths: ["clear structure"], weaknesses: ["limited range"], critical_errors: [], recurrent_errors: ["article omission"],
        status: "reviewed",
      }],
    }));
    return;
  }
  if (url.pathname === `/api/teacher/organizations/${TEACHER_ORG}/students/${TEACHER_STUDENT}/proficiency`) {
    res.end(JSON.stringify({
      ok: true, studentId: TEACHER_STUDENT,
      skills: [{ skill: "reading", theta: 0.4, sigma2: 0.2, n_events: 12, last_event_at: "2026-08-20T09:00:00Z" }],
    }));
    return;
  }
  if (url.pathname === `/api/teacher/organizations/${TEACHER_ORG}/students/${TEACHER_STUDENT}/speaking`) {
    res.end(JSON.stringify({
      ok: true, studentId: TEACHER_STUDENT,
      attempts: [{ id: "sp-1", created_at: "2026-08-10T09:00:00Z", fluency_score: 65, grammar_score: null, vocabulary_score: null, coherence_score: null, task_achievement_score: null, ratable: true }],
    }));
    return;
  }
  if (url.pathname === `/api/teacher/organizations/${TEACHER_ORG}/students/${TEACHER_STUDENT}/diagnosis`) {
    res.end(JSON.stringify({
      ok: true,
      risk: { status: "HEALTHY", reason: "active", idleDays: 1 },
      findings: [{
        id: "skill_volume_imbalance",
        observed: "Reading: 12 items · Listening: 3 items (last 30 days)",
        calculated: "Listening is under-practiced relative to Reading",
        recommended: "Consider assigning additional Listening practice",
      }],
    }));
    return;
  }
  // ── FASE PLATFORM-ENTERPRISE-001 — administration endpoints ─────────────
  // The mock mirrors the real backend's PERMISSION split, not just its
  // shapes: a teacher may read members and settings, and may not read the
  // audit trail. Without that, the E2E gate test would pass against a mock
  // that never refuses anything.
  const orgBase = `/api/teacher/organizations/${TEACHER_ORG}`;
  if (url.pathname === `${orgBase}/members`) {
    res.end(JSON.stringify({
      ok: true,
      members: [
        { membershipId: "m-owner", userId: "teacher-1", name: "E2E Owner", email: "owner@example.com",
          role: callerRole, status: "active", groupId: null, groupName: null, joinedAt: "2026-01-01T00:00:00Z" },
        // PLATFORM-GROUPS-001 — read from the live map so People reflects an
        // assignment made anywhere else in the flow.
        (() => {
          const g = MOCK_MEMBER_GROUPS.get(TEACHER_STUDENT) ?? null;
          return { membershipId: "m-student", userId: TEACHER_STUDENT, name: "E2E Student", email: "student@example.com",
            role: "student", status: "active", groupId: g,
            groupName: g ? (MOCK_GROUPS.find((x) => x.id === g)?.name ?? null) : null,
            joinedAt: "2026-01-02T00:00:00Z" };
        })(),
      ],
    }));
    return;
  }
  if (url.pathname === `${orgBase}/invites` && req.method === "GET") {
    // PLATFORM-MAIL-001 — read from the mutable store so an invitation created
    // by one request is visible to the next, with its real delivery state. A
    // frozen fixture would let the whole workflow pass while doing nothing.
    if (MOCK_INVITE_ROWS.size === 0) {
      MOCK_INVITE_ROWS.set("invite-e2e", {
        id: "invite-e2e", role: "student", groupId: null, email: null, status: "pending",
        deliveryStatus: "not_requested", deliveryError: null, lastSentAt: null, sendCount: 0,
        expiresAt: "2099-01-01T00:00:00Z", createdAt: "2026-01-03T00:00:00Z", acceptedAt: null,
      });
    }
    res.end(JSON.stringify({
      ok: true,
      invites: [...MOCK_INVITE_ROWS.values()].reverse().map(inviteView),
    }));
    return;
  }

  // A test-only door into the fake transport. Not a product route: it exists
  // so a spec can read what was "sent" and can arm a provider failure without
  // a network. The real backend has no such endpoint.
  if (url.pathname === "/__mock/mailbox") {
    if (req.method === "DELETE") { MOCK_MAILBOX.length = 0; mailFailNext = null; res.end(JSON.stringify({ ok: true })); return; }
    if (req.method === "POST") {
      withBody(req, (body) => {
        mailFailNext = body?.failNext ?? null;
        res.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    res.end(JSON.stringify({ ok: true, messages: MOCK_MAILBOX }));
    return;
  }
  if (url.pathname === `${orgBase}/settings`) {
    if (req.method === "PATCH") {
      withBody(req, (body) => {
        const name = typeof body.name === "string" ? body.name.trim() : "";
        if (!name) { res.statusCode = 400; res.end(JSON.stringify({ error: "validation_error", reason: "validation_error" })); return; }
        res.end(JSON.stringify({ ok: true, settings: { organizationId: TEACHER_ORG, name } }));
      });
      return;
    }
    res.end(JSON.stringify({
      ok: true,
      settings: {
        organizationId: TEACHER_ORG, name: "SLP Command E2E Academy", slug: "e2e-academy",
        type: "enterprise", status: "active", customDomain: null, customDomainStatus: "none",
        createdAt: "2026-01-01T00:00:00Z",
      },
      branding: null,
    }));
    return;
  }
  if (url.pathname === `${orgBase}/branding`) {
    res.end(JSON.stringify({ ok: true, branding: null }));
    return;
  }
  if (url.pathname === `${orgBase}/flags`) {
    res.end(JSON.stringify({
      ok: true,
      flags: {
        reading_enabled: { enabled: true, source: "platform", platformDefault: true },
        speaking_enabled: { enabled: false, source: "organization", platformDefault: true },
      },
    }));
    return;
  }
  if (url.pathname === `${orgBase}/reports/overview`) {
    res.end(JSON.stringify({
      ok: true,
      overview: {
        organizationId: TEACHER_ORG, windowDays: 30, groupId: null,
        studentCount: 1, staffCount: 1, groupCount: 1, hasData: true,
        activeStudentsInWindow: 1, studentsInactiveInWindow: 0, studentsWithNoActivityEver: 0,
        totals: {
          readingPracticeQuestions: 12, readingExams: 1, listeningPracticeQuestions: 4,
          listeningExams: 0, writingSubmissions: 2, speakingEvaluations: 0,
          academyCompletions: 3, qualifyingActivities: 9,
        },
        writing: { attempts: 2, scoredAttempts: 2, averageOverallScore: 6.5 },
      },
    }));
    return;
  }
  if (url.pathname === `${orgBase}/reports/activity`) {
    res.end(JSON.stringify({
      ok: true,
      trend: { organizationId: TEACHER_ORG, windowDays: 30, days: [{ date: "2026-08-20", activeStudents: 1, qualifyingActivities: 9 }] },
    }));
    return;
  }
  if (url.pathname === `${orgBase}/reports/proficiency`) {
    res.end(JSON.stringify({
      ok: true,
      proficiency: { organizationId: TEACHER_ORG, skills: [{ skill: "reading", studentCount: 1, totalEvents: 12, meanTheta: 0.42, minTheta: 0.42, maxTheta: 0.42 }] },
    }));
    return;
  }
  if (url.pathname === `${orgBase}/reports/groups`) {
    res.end(JSON.stringify({
      ok: true,
      breakdown: { organizationId: TEACHER_ORG, days: 30, groups: [{ groupId: "group-1", groupName: "Morning cohort", studentCount: 1, activeStudentsInWindow: 1, qualifyingActivities: 9, writingSubmissions: 2 }] },
    }));
    return;
  }
  if (url.pathname === `${orgBase}/audit`) {
    // The permission split, enforced by the mock exactly as the real backend
    // enforces it — a teacher has no audit.read.
    if (!isOwnerCaller) {
      res.statusCode = 403;
      res.end(JSON.stringify({ error: "forbidden", reason: "forbidden", requiredPermission: "audit.read" }));
      return;
    }
    res.end(JSON.stringify({
      ok: true, total: 1,
      entries: [{
        id: "1", event: "org.member_role_changed", actorId: "teacher-1", actorName: "E2E Owner",
        actorEmail: "owner@example.com", targetId: TEACHER_STUDENT,
        metadata: { from: "student", to: "teacher" }, at: "2026-08-20T10:00:00Z",
      }],
    }));
    return;
  }

  if (url.pathname === `/api/teacher/organizations/${TEACHER_ORG}/alerts`) {
    // PLATFORM-GROUPS-001 — one real row, so the page is actually exercised.
    // It returned an empty list before, which meant the Alerts table rendered
    // no rows at all and the switch from printing a raw studentId to printing
    // a name was covered by nothing.
    res.end(JSON.stringify({
      ok: true,
      totalStudents: 1,
      students: [{
        studentId: TEACHER_STUDENT,
        name: "E2E Student",
        email: "student@example.com",
        memberSince: "2026-01-15T00:00:00Z",
        groupId: null, groupName: null, targetLevel: "3",
        lastActivityAt: "2026-07-01T09:00:00Z", lastActivityDate: "2026-07-01",
        risk: { status: "AT_RISK", idleDays: 56 },
      }],
    }));
    return;
  }
  if (url.pathname === `/api/teacher/organizations/${TEACHER_ORG}/groups`) {
    if (req.method === "POST") {
      withBody(req, (body) => {
        const name = typeof body.name === "string" ? body.name.trim() : "";
        if (!name) { res.statusCode = 400; res.end(JSON.stringify({ error: "name is required" })); return; }
        if (MOCK_GROUPS.some((g) => g.name === name)) {
          res.statusCode = 409; res.end(JSON.stringify({ error: "a group with this name already exists" })); return;
        }
        const group = { id: `group-${MOCK_GROUPS.length + 1}`, name, created_at: new Date().toISOString(), studentCount: 0 };
        MOCK_GROUPS.push(group);
        res.statusCode = 201;
        res.end(JSON.stringify({ ok: true, group }));
      });
      return;
    }
    res.end(JSON.stringify({ ok: true, groups: groupsWithCounts(), unassignedCount: unassignedCount() }));
    return;
  }

  // ── FASE PLATFORM-GROUPS-001 — the two PATCHes D3 needs ──────────────────
  // Neither existed in this fixture: it had no PATCH handler of any kind, so
  // the group-assignment and rename endpoints could not be exercised end to
  // end at all. Both model the real backend's refusals, not just its successes
  // — a mock that only ever succeeds proves nothing about error handling.

  const renameMatch = url.pathname.match(
    new RegExp(`^/api/teacher/organizations/${TEACHER_ORG}/groups/([^/]+)$`),
  );
  if (renameMatch && req.method === "PATCH") {
    withBody(req, (body) => {
      const groupId = renameMatch[1];
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const group = MOCK_GROUPS.find((g) => g.id === groupId);
      if (!group) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "not_found", reason: "not_found", message: "No such group." }));
        return;
      }
      if (!name || name.length > 100) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "invalid_name", reason: "invalid_name", message: "Enter a group name." }));
        return;
      }
      // UNIQUE (organization_id, name) — the real constraint, so the 409 the
      // rename form has its own message for is genuinely reachable here.
      if (MOCK_GROUPS.some((g) => g.id !== groupId && g.name === name)) {
        res.statusCode = 409;
        res.end(JSON.stringify({ error: "duplicate_name", reason: "duplicate_name", message: "A group with this name already exists." }));
        return;
      }
      group.name = name;
      res.end(JSON.stringify({ ok: true, group: { id: group.id, name: group.name, created_at: group.created_at } }));
    });
    return;
  }

  const assignMatch = url.pathname.match(
    new RegExp(`^/api/teacher/organizations/${TEACHER_ORG}/members/([^/]+)/group$`),
  );
  if (assignMatch && req.method === "PATCH") {
    withBody(req, (body) => {
      const userId = assignMatch[1];
      const groupId = body.groupId ?? null;
      if (!MOCK_MEMBER_GROUPS.has(userId)) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "not_found", reason: "not_found", message: "no such active membership" }));
        return;
      }
      // null is a real removal, not a missing value: it is how the product
      // returns somebody to Unassigned.
      if (groupId !== null && !MOCK_GROUPS.some((g) => g.id === groupId)) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "group_not_found", reason: "group_not_found", message: "no such group in this organization" }));
        return;
      }
      MOCK_MEMBER_GROUPS.set(userId, groupId);
      res.end(JSON.stringify({ ok: true, member: { userId, role: body.role ?? "student", groupId } }));
    });
    return;
  }
  if (url.pathname === `/api/teacher/organizations/${TEACHER_ORG}/invites` && req.method === "POST") {
    withBody(req, (body) => {
      const role = typeof body.role === "string" ? body.role : "student";
      const groupId = typeof body.groupId === "string" ? body.groupId : null;
      const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
      const email = rawEmail || null;

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "invalid_email", reason: "invalid_email", field: "email",
          message: "Enter a valid email address." }));
        return;
      }
      // Duplicate detection, scoped to this organization exactly as the real
      // backend does it.
      if (email && [...MOCK_INVITE_ROWS.values()].some((r) => r.email === email && r.status === "pending")) {
        res.statusCode = 409;
        res.end(JSON.stringify({ error: "pending_invite", reason: "pending_invite", field: "email",
          message: "There is already a pending invitation for that address." }));
        return;
      }

      const token = crypto.randomBytes(32).toString("hex");
      const id = `invite-${++inviteSeq}`;
      const row = {
        id, role, groupId, email, status: "pending",
        deliveryStatus: "not_requested", deliveryError: null, lastSentAt: null, sendCount: 0,
        expiresAt: "2099-01-01T00:00:00Z", createdAt: new Date().toISOString(), acceptedAt: null,
      };
      MOCK_INVITE_ROWS.set(id, row);
      MOCK_INVITES.set(token, { organizationId: TEACHER_ORG, role, groupId, used: false, inviteId: id });

      let delivery = { status: "not_requested", retriable: false };
      if (email) delivery = fakeDeliver(row, token, "SLP Command E2E Academy");

      res.statusCode = 201;
      res.end(JSON.stringify({
        ok: true,
        invite: { id, role, email, expiresAt: row.expiresAt, token,
          url: `http://localhost:3000/invite/accept?token=${token}` },
        delivery,
      }));
    });
    return;
  }

  // PLATFORM-MAIL-001 — resend. ROTATES the token, leaves the expiry alone.
  const resendMatch = url.pathname.match(
    new RegExp(`^/api/teacher/organizations/${TEACHER_ORG}/invites/([^/]+)/resend$`));
  if (resendMatch && req.method === "POST") {
    const row = MOCK_INVITE_ROWS.get(resendMatch[1]);
    if (!row) { res.statusCode = 404; res.end(JSON.stringify({ error: "not_found", reason: "not_found" })); return; }
    const now = Date.now();
    const refuse = (reason, message) => {
      res.statusCode = 409;
      res.end(JSON.stringify({ error: reason, reason, message }));
    };
    if (row.status !== "pending") return refuse("not_pending", "That invitation is no longer pending.");
    if (!row.email) return refuse("link_only", "That invitation has no email address.");
    if (row.sendCount >= MAX_SENDS_PER_INVITE) return refuse("max_sends", "Sent the maximum number of times.");
    if (row.lastSentAt && now - new Date(row.lastSentAt).getTime() < RESEND_COOLDOWN_MS) {
      return refuse("cooldown", "That invitation was sent very recently.");
    }

    // Rotation: the OLD token stops working, a NEW one is issued, and the
    // expiry does not move.
    for (const [tok, meta] of MOCK_INVITES) if (meta.inviteId === row.id) MOCK_INVITES.delete(tok);
    const token = crypto.randomBytes(32).toString("hex");
    MOCK_INVITES.set(token, { organizationId: TEACHER_ORG, role: row.role, groupId: row.groupId, used: false, inviteId: row.id });

    const delivery = fakeDeliver(row, token, "SLP Command E2E Academy");
    res.end(JSON.stringify({ ok: true, delivery, invite: inviteView(row) }));
    return;
  }
  if (url.pathname === "/api/teacher/invites/accept" && req.method === "POST") {
    withBody(req, (body) => {
      const token = typeof body.token === "string" ? body.token : "";
      const invite = MOCK_INVITES.get(token);
      if (!invite || invite.used) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "invalid_or_expired" }));
        return;
      }
      invite.used = true;
      res.end(JSON.stringify({ ok: true, organizationId: invite.organizationId, role: invite.role }));
    });
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(process.env.MOCK_BACKEND_PORT || 3999, "127.0.0.1", () => {
  console.log("mock backend ready");
});
