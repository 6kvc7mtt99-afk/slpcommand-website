export const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);

export const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9:_-]{1,200}$/;

const QUOTA_PATHS = new Set([
  "GET /api/reading/passage",
  "GET /api/listening/slp/next",
  "POST /api/reading/exam/start-v2",
  "POST /api/listening/slp/exam/start",
  "POST /api/writing/submit",
  "POST /api/writing/sentence-feedback",
  "POST /api/writing/intelligence/transform",
  "POST /api/speaking/evaluate",
]);

type Rule = { method?: string; pattern: RegExp; reason: string };

const DENY: Rule[] = [
  { method: "POST", pattern: /^\/api\/billing\/revenuecat\/webhook$/, reason: "webhook" },
  { method: "POST", pattern: /^\/api\/speaking\/coach\/webhook$/, reason: "webhook" },
  { method: "POST", pattern: /^\/api\/admin\/billing\/reconcile$/, reason: "admin_secret" },
  // Q4 audit — two shared-secret billing routes were added to Express while
  // this file still relied on the blanket `/api/admin/` allow below. Neither
  // is exploitable through the proxy today, because `buildUpstreamHeaders`
  // never forwards `x-admin-secret` and Express answers 403 without it. They
  // are denied by name anyway, for the same reason `reconcile` is: a route
  // that can grant a plan, or that reports on a webhook secret, should be
  // unreachable from a browser by policy rather than by a header allowlist
  // happening to hold.
  { method: "POST", pattern: /^\/api\/admin\/billing\/manual-grant$/, reason: "admin_secret" },
  { method: "GET", pattern: /^\/api\/admin\/billing\/webhook-secret-fingerprint$/, reason: "admin_secret" },
  { pattern: /^\/api\/internal(?:\/|$)/, reason: "internal" },
  { method: "POST", pattern: /^\/api\/reading\/generate$/, reason: "admin_secret" },
  { method: "POST", pattern: /^\/api\/listening\/generate$/, reason: "admin_secret" },
  { method: "POST", pattern: /^\/api\/writing\/prompts\/generate-batch$/, reason: "admin_secret" },
  { method: "GET", pattern: /^\/api\/listening\/telemetry\/metrics$/, reason: "admin_secret" },
  { method: "GET", pattern: /^\/api\/reading\/next$/, reason: "legacy" },
  { method: "POST", pattern: /^\/api\/reading\/exam\/start$/, reason: "legacy" },
  { method: "POST", pattern: /^\/api\/writing\/drill-feedback$/, reason: "legacy" },
  { method: "GET", pattern: /^\/api\/listening\/recommendation$/, reason: "legacy" },
  { method: "POST", pattern: /^\/api\/progress\/save$/, reason: "legacy" },
  { method: "GET", pattern: /^\/api\/writing\/intelligence\/(readiness|missions|brain-profile|mastery)$/, reason: "legacy" },
];

const ALLOW: Rule[] = [
  { method: "GET", pattern: /^\/api\/feature-flags$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/entitlements$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/progress$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/profile$/, reason: "ok" },
  { method: "PATCH", pattern: /^\/api\/profile$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/account\/export$/, reason: "ok" },
  { method: "DELETE", pattern: /^\/api\/account$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/reports$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/support\/conversations$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/support\/conversations$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/support\/conversations\/[^/]+$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/support\/conversations\/[^/]+\/messages$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/support\/cases$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/support\/cases\/[^/]+$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/support\/cases$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/session\/today$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/activity\/streak$/, reason: "ok" },
  // FASE ACADEMY-LOOP-CLOSURE-001 — the Academy leg of the loop, which was open.
  // The endpoint, its RPC and its table have been in production since
  // RETENTION-ENGINE-PHASE-3 and nothing has ever called them; the web client
  // could not have, because the path was not on this allowlist. Not a quota path:
  // record_academy_completion() is idempotent on
  // (user, skill, activity_id, activity_date), so a repeat costs nothing and
  // there is no charge for a retry to double-fire.
  { method: "POST", pattern: /^\/api\/academy\/complete$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/activity\/achievements$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/activity\/recent$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/reading\/passage$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/reading\/answer$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/reading\/exam\/start-v2$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/reading\/exam\/finish$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/listening\/slp\/next$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/listening\/slp\/answer$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/listening\/slp\/exam\/start$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/listening\/slp\/exam\/answer$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/listening\/slp\/exam\/play$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/listening\/slp\/exam\/state$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/listening\/slp\/exam\/finish$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/writing\/prompts\/next$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/writing\/submit$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/writing\/attempts$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/health$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/reading\/academy\/home$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/reading\/academy\/map$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/reading\/academy\/lesson\/[^/]+$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/reading\/intelligence\/(readiness|weakness-profile|missions|brain-profile|mastery)$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/listening\/academy\/home$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/listening\/academy\/map$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/listening\/academy\/skill\/[^/]+$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/listening\/intelligence\/(readiness|weakness-profile|missions|brain-profile|mastery)$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/writing\/academy\/home$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/writing\/academy\/lesson\/[^/]+$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/writing\/academy\/lessons$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/writing\/academy\/recommend$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/writing\/academy\/search$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/writing\/academy\/collections$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/writing\/academy\/collection\/[^/]+$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/writing\/academy\/pathway$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/writing\/orchestrator\/next$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/writing\/intelligence\/transform$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/writing\/sentence-feedback$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/writing\/intelligence\/weakness-profile$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/writing\/learning-state$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/writing\/competencies$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/speaking\/evaluate$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/speaking\/attempts\/[0-9a-f-]{36}\/save-audio$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/speaking\/history$/, reason: "ok" },
  { method: "DELETE", pattern: /^\/api\/speaking\/attempts\/[0-9a-f-]{36}\/audio$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/speaking\/coach\/readiness$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/speaking\/coach\/mission$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/speaking\/coach\/balance$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/speaking\/coach\/consent$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/speaking\/coach\/session$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/speaking\/coach\/session\/[^/]+$/, reason: "ok" },
  // EXAM-REAL-003, Checkpoint 3 — SLP3 Real Exam Speaking. No requireQuota on the backend
  // (EXAM_MODULE has no SPEAKING entry — documented, deliberate omission, see server.js),
  // so these are not in QUOTA_PATHS below either: there is no charge to protect against a
  // retry double-firing. Session-start duplication is instead guarded client-side
  // (lib/speaking/examSession.ts's inflight/cached memoization, mirroring Listening's).
  { method: "POST", pattern: /^\/api\/speaking\/exam\/start$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/speaking\/exam\/warmup\/respond$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/speaking\/exam\/respond$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/speaking\/exam\/finish$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/speaking\/exam\/state$/, reason: "ok" },
  // requireAdminUser console. DENY is evaluated first, so shared-secret
  // POST /api/admin/billing/reconcile stays 410.
  { method: "GET", pattern: /^\/api\/admin\//, reason: "ok" },
  { method: "POST", pattern: /^\/api\/admin\//, reason: "ok" },
  { method: "PATCH", pattern: /^\/api\/admin\//, reason: "ok" },

  // FASE TEACHER-WEB-001 — SLP Command Teacher, read-only in this phase.
  // Every route is GET; the backend's own requireTeacherRole +
  // requireOrgMembership decide access from the verified JWT, never from
  // this allowlist — this only says the PROXY may forward the request at
  // all, same division of responsibility as every other entry above.
  { method: "GET", pattern: /^\/api\/teacher\/me$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/teacher\/organizations\/[^/]+\/students$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/teacher\/organizations\/[^/]+\/students\/[^/]+$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/teacher\/organizations\/[^/]+\/students\/[^/]+\/activity$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/teacher\/organizations\/[^/]+\/students\/[^/]+\/writing$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/teacher\/organizations\/[^/]+\/students\/[^/]+\/proficiency$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/teacher\/organizations\/[^/]+\/students\/[^/]+\/speaking$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/teacher\/organizations\/[^/]+\/students\/[^/]+\/diagnosis$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/teacher\/organizations\/[^/]+\/alerts$/, reason: "ok" },
  // FASE TEACHER-GROUPS-001 — groups and secure invitations. The invited
  // role/organization are still resolved server-side (canInviteRole reads
  // req.teacherOrgMembership, never the request body) — this allowlist only
  // says the proxy may forward the request at all.
  { method: "GET", pattern: /^\/api\/teacher\/organizations\/[^/]+\/groups$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/teacher\/organizations\/[^/]+\/groups$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/teacher\/organizations\/[^/]+\/invites$/, reason: "ok" },
  // FASE PLATFORM-MAIL-001 — resend one invitation's email. Anchored at both
  // ends and pinned to POST: it WRITES (it rotates the invitation's token and
  // calls the mail provider), so a GET of this path must not exist, and
  // `/invites/<anything-else>` must stay unreachable. Tests in
  // platformProxyPolicy.test.ts mutate this rule four ways.
  { method: "POST", pattern: /^\/api\/teacher\/organizations\/[^/]+\/invites\/[^/]+\/resend$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/teacher\/invites\/accept$/, reason: "ok" },

  // FASE PLATFORM-TENANT-001 / PLATFORM-ENTERPRISE-001 — Enterprise
  // administration and White-Label. Same division of responsibility as every
  // entry above: this allowlist only says the PROXY may forward the request at
  // all. Who may actually do it is decided by the backend's own
  // requireTeacherRole + requireOrgMembership + requirePermission stack, from
  // the verified JWT, on every single call.
  //
  // The `/api/admin/` block earlier in this list already covers the
  // platform-admin tenant-provisioning routes, which is why they are not
  // repeated here — they are gated by requireAdminUser upstream.
  { method: "GET", pattern: /^\/api\/platform\/tenant\/resolve$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/platform\/tenant\/by-slug\/[^/]+$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/teacher\/organizations\/[^/]+\/settings$/, reason: "ok" },
  { method: "PATCH", pattern: /^\/api\/teacher\/organizations\/[^/]+\/settings$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/teacher\/organizations\/[^/]+\/branding$/, reason: "ok" },
  { method: "PATCH", pattern: /^\/api\/teacher\/organizations\/[^/]+\/branding$/, reason: "ok" },
  { method: "DELETE", pattern: /^\/api\/teacher\/organizations\/[^/]+\/branding$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/teacher\/organizations\/[^/]+\/members$/, reason: "ok" },
  { method: "PATCH", pattern: /^\/api\/teacher\/organizations\/[^/]+\/members\/[^/]+\/role$/, reason: "ok" },
  { method: "PATCH", pattern: /^\/api\/teacher\/organizations\/[^/]+\/members\/[^/]+\/group$/, reason: "ok" },
  { method: "DELETE", pattern: /^\/api\/teacher\/organizations\/[^/]+\/members\/[^/]+$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/teacher\/organizations\/[^/]+\/invites$/, reason: "ok" },
  { method: "DELETE", pattern: /^\/api\/teacher\/organizations\/[^/]+\/invites\/[^/]+$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/teacher\/organizations\/[^/]+\/flags$/, reason: "ok" },
  { method: "PATCH", pattern: /^\/api\/teacher\/organizations\/[^/]+\/flags\/[^/]+$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/teacher\/organizations\/[^/]+\/reports\/(overview|activity|proficiency|groups)$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/teacher\/organizations\/[^/]+\/audit$/, reason: "ok" },

  // FASE PLATFORM-DOMAINS-001 — the custom-domain lifecycle. Each pinned to
  // one method: verify/activate/deactivate are POST because they WRITE (a DNS
  // lookup result, a status transition), not because of habit.
  { method: "GET", pattern: /^\/api\/teacher\/organizations\/[^/]+\/domain$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/teacher\/organizations\/[^/]+\/domain$/, reason: "ok" },
  { method: "DELETE", pattern: /^\/api\/teacher\/organizations\/[^/]+\/domain$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/teacher\/organizations\/[^/]+\/domain\/(verify|activate|deactivate)$/, reason: "ok" },
  // FASE PLATFORM-ACADEMY-001 — rename a cohort.
  { method: "PATCH", pattern: /^\/api\/teacher\/organizations\/[^/]+\/groups\/[^/]+$/, reason: "ok" },

  // FASE PLATFORM-PROVISIONING-001 — creating an academy.
  //
  // These are the ONLY routes in this list a caller with no membership
  // anywhere may reach, and that is the point rather than an oversight: the
  // person creating their first academy has no organization to be scoped to
  // yet. What stands in for the usual requireOrgMembership is the shape of
  // what the backend will do — it can only ever create an academy owned by
  // the caller themselves, at most a fixed number of times, rate-limited per
  // user rather than per IP.
  //
  // Four exact paths, four exact methods, each anchored at both ends. NOT a
  // /api/academies prefix: a broad pattern here would forward every future
  // path under that namespace before anyone had decided the browser should
  // reach it, including ones that do not exist yet. `GET /api/academies`
  // (a listing) and `DELETE /api/academies` are deliberately absent — no such
  // route exists, and the proxy must not be the thing that discovers it.
  //
  // decidePolicy strips the query string before matching, so the `$` anchors
  // still hold for `?slug=` and `?name=`.
  { method: "GET", pattern: /^\/api\/academies\/quota$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/academies\/slug-available$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/academies\/suggest-slug$/, reason: "ok" },
  { method: "POST", pattern: /^\/api\/academies$/, reason: "ok" },
];

export type PolicyDecision =
  | { action: "forward" }
  | { action: "deny"; status: 400 | 404 | 410; error: string; reason?: string };

function matches(rule: Rule, method: string, path: string): boolean {
  if (rule.method && rule.method !== method) return false;
  return rule.pattern.test(path);
}

export function normalizeBackendPath(path: string): string {
  const trimmed = path.startsWith("/") ? path : `/${path}`;
  if (trimmed.startsWith("/api/")) return trimmed;
  return `/api${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

export function decidePolicy(method: string, path: string): PolicyDecision {
  const m = method.toUpperCase();
  const p = normalizeBackendPath(path.split("?")[0] ?? path);
  if (!ALLOWED_METHODS.has(m)) return { action: "deny", status: 404, error: "not_found" };
  for (const rule of DENY) {
    if (matches(rule, m, p)) {
      return { action: "deny", status: 410, error: "gone", reason: rule.reason };
    }
  }
  for (const rule of ALLOW) {
    if (matches(rule, m, p)) return { action: "forward" };
  }
  return { action: "deny", status: 404, error: "not_found" };
}

export function requiresIdempotency(method: string, path: string): boolean {
  const p = normalizeBackendPath(path.split("?")[0] ?? path);
  return QUOTA_PATHS.has(`${method.toUpperCase()} ${p}`);
}

export function buildUpstreamHeaders(opts: {
  accessToken?: string;
  idempotencyKey?: string;
  correlationId: string;
  clientIp?: string;
  contentType?: string;
}): Headers {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (opts.contentType) headers.set("Content-Type", opts.contentType);
  if (opts.accessToken) headers.set("Authorization", `Bearer ${opts.accessToken}`);
  if (opts.idempotencyKey) headers.set("X-Idempotency-Key", opts.idempotencyKey);
  headers.set("x-correlation-id", opts.correlationId);
  if (opts.clientIp) headers.set("X-SLP-Client-IP", opts.clientIp);
  return headers;
}

export function isValidIdempotencyKey(value: string | null): value is string {
  return !!value && IDEMPOTENCY_KEY_RE.test(value);
}
