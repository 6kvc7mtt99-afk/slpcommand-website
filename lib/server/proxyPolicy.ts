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
  { method: "GET", pattern: /^\/api\/session\/today$/, reason: "ok" },
  { method: "GET", pattern: /^\/api\/activity\/streak$/, reason: "ok" },
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
  // requireAdminUser console. DENY is evaluated first, so shared-secret
  // POST /api/admin/billing/reconcile stays 410.
  { method: "GET", pattern: /^\/api\/admin\//, reason: "ok" },
  { method: "POST", pattern: /^\/api\/admin\//, reason: "ok" },
  { method: "PATCH", pattern: /^\/api\/admin\//, reason: "ok" },
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
