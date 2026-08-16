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
    res.end(JSON.stringify({ ok: true, plan: { key: "free", name: "Free" }, features: [{ key: "reading_practice", enabled: true, quota: { period: "weekly", limit: 10, remaining: 4 } }] }));
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
  res.statusCode = 404;
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(process.env.MOCK_BACKEND_PORT || 3999, "127.0.0.1", () => {
  console.log("mock backend ready");
});
