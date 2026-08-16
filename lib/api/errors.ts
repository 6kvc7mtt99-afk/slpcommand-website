export type FrontendErrorCode =
  | "network"
  | "auth"
  | "quota"
  | "entitlement"
  | "noPlan"
  | "validation"
  | "backend"
  | "ai"
  | "audio"
  | "missing_client_header"
  | "missing_idempotency_key"
  | "gone"
  | "rate_limit"
  | "unexpected";

export class FrontendError extends Error {
  readonly code: FrontendErrorCode;
  readonly status: number;
  readonly reason?: string;
  readonly correlationId?: string;
  readonly retryable: boolean;
  readonly remaining?: number;
  readonly limit?: number;
  readonly period?: string;

  constructor(init: {
    code: FrontendErrorCode;
    message: string;
    status: number;
    reason?: string;
    correlationId?: string;
    retryable?: boolean;
    remaining?: number;
    limit?: number;
    period?: string;
  }) {
    super(init.message);
    this.name = "FrontendError";
    this.code = init.code;
    this.status = init.status;
    this.reason = init.reason;
    this.correlationId = init.correlationId;
    this.retryable = init.retryable ?? false;
    this.remaining = init.remaining;
    this.limit = init.limit;
    this.period = init.period;
  }
}

const WRITING_REASONS = new Set([
  "prompt_unavailable",
  "ai_timeout",
  "ai_upstream_error",
  "ai_parse_failed",
  "database_read_failed",
  "database_write_failed",
  "service_unavailable",
  "invalid_submission",
  "unknown_processing_error",
]);

const COMMERCIAL_REASONS = new Set([
  "no_active_plan",
  "feature_not_in_plan",
  "unknown_feature",
  "no_quota_definition",
  "quota_exceeded",
]);

export function userMessageFor(error: FrontendError): string {
  switch (error.code) {
    case "network":
      return "Unable to connect. Check your connection and try again.";
    case "auth":
      return "Incorrect email or password.";
    case "quota":
      return "You have used the allowance on your current plan.";
    case "entitlement":
      return "This feature is not available on your current plan.";
    case "noPlan":
      return "Your plan is still being set up. You can continue on Free.";
    case "rate_limit":
      return error.reason === "writing_daily_cap"
        ? "Daily technical limit (20), not your plan quota."
        : "Too many requests. Please wait a moment and try again.";
    case "missing_client_header":
    case "missing_idempotency_key":
      return "This request could not be completed safely. Refresh the page and try again.";
    case "gone":
      return "That action is no longer available.";
    case "ai":
      return "Evaluation is temporarily unavailable. You were not charged if this failed.";
    case "backend":
      if (error.reason === "empty_pool") return "No listening items available right now.";
      if (error.reason === "exam_not_found") return "This exam session is no longer available.";
      return "Something went wrong. Your progress was not changed.";
    default:
      return "Something went wrong. Your progress was not changed.";
  }
}

export function normalizeBackendError(input: {
  status: number;
  body: unknown;
  correlationId?: string;
  path?: string;
}): FrontendError {
  const body = (input.body ?? {}) as Record<string, unknown>;
  const rawError = typeof body.error === "string" ? body.error : "";
  const reason = typeof body.reason === "string" ? body.reason : undefined;
  const correlationId =
    input.correlationId ?? (typeof body.request_id === "string" ? body.request_id : undefined);

  if (input.status === 401) {
    return new FrontendError({
      code: "auth",
      message: "unauthorized",
      status: 401,
      reason,
      correlationId,
    });
  }

  if (input.status === 404 && input.path?.includes("/entitlements")) {
    return new FrontendError({
      code: "noPlan",
      message: "No active plan found for this account.",
      status: 404,
      reason: "no_active_plan",
      correlationId,
    });
  }

  if (input.status === 404 && /exam session not found/i.test(rawError)) {
    return new FrontendError({
      code: "backend",
      message: "This exam session is no longer available.",
      status: 404,
      reason: "exam_not_found",
      correlationId,
    });
  }

  if (input.status === 404 && /no hay listenings/i.test(rawError)) {
    return new FrontendError({
      code: "backend",
      message: "No listening items available.",
      status: 404,
      reason: "empty_pool",
      correlationId,
    });
  }

  if (input.status === 402 || (input.status === 403 && reason && COMMERCIAL_REASONS.has(reason))) {
    return new FrontendError({
      code: input.status === 402 ? "quota" : "entitlement",
      message: "commercial",
      status: input.status,
      reason,
      correlationId,
      remaining: typeof body.remaining === "number" ? body.remaining : undefined,
      limit: typeof body.limit === "number" ? body.limit : undefined,
      period: typeof body.period === "string" ? body.period : undefined,
    });
  }

  if (input.status === 429) {
    const writingCap = input.path?.includes("/writing/");
    return new FrontendError({
      code: "rate_limit",
      message: "rate_limited",
      status: 429,
      reason: writingCap ? "writing_daily_cap" : "ip_limit",
      correlationId,
      retryable: true,
    });
  }

  if (reason && WRITING_REASONS.has(reason)) {
    return new FrontendError({
      code: "ai",
      message: reason,
      status: input.status,
      reason,
      correlationId,
      retryable: body.retryable === true,
    });
  }

  if (input.status === 400) {
    return new FrontendError({
      code: "validation",
      message: "invalid_request",
      status: 400,
      reason,
      correlationId,
    });
  }

  if (input.status >= 500) {
    return new FrontendError({
      code: "backend",
      message: "backend_failure",
      status: input.status,
      reason,
      correlationId,
      retryable: true,
    });
  }

  return new FrontendError({
    code: "unexpected",
    message: "unexpected",
    status: input.status,
    reason,
    correlationId,
  });
}
