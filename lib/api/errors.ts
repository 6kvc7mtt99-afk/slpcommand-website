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

/**
 * What can HONESTLY be said about the learner's allowance after a failure.
 *
 * The client cannot observe billing, so for most of this product's life these
 * screens simply asserted "You were not charged." — a claim with nothing behind
 * it. There IS something behind it now, but only in a specific case, and this
 * function is the line between them.
 *
 * `requireQuota` consumes the unit BEFORE the handler runs and registers a
 * `res.on("finish")` hook that refunds it on ANY response with status >= 400
 * (backend entitlements.js). So when the backend answered with a 4xx, the
 * refund has already fired and the reassurance is a fact.
 *
 * It stays silent for 5xx and for transport failures, because those are exactly
 * the cases where the client cannot tell a backend that answered from one that
 * never did: web's own proxy synthesises a 504 when `fetch` rejects
 * (lib/server/backend.ts), and an upstream that died mid-request never fired
 * the hook. Saying nothing there is the honest option; inventing certainty is
 * how "You were not charged" became false in the first place.
 */
export function quotaReassurance(error: unknown): string {
  const status =
    error instanceof FrontendError
      ? error.status
      : typeof error === "object" && error && "status" in error
        ? Number((error as { status: unknown }).status)
        : 0;
  if (status >= 400 && status < 500) return "Your allowance was not spent.";
  return "";
}

export function userMessageFor(error: FrontendError): string {
  switch (error.code) {
    case "network":
      return "Unable to connect. Check your connection and try again.";
    /**
     * A 401 on an AUTHENTICATED call is an expired session, never a typo.
     *
     * THE BUG THIS FIXES. `normalizeBackendError` stamps `code: "auth"` on
     * every 401 from every endpoint, and this line turned all of them into
     * "Incorrect email or password." — a sentence that is only ever true on a
     * login form. Roughly nineteen authenticated surfaces render this string
     * (`err.message`, set by apiRequest), so a learner whose token expired
     * mid-session was told they had mistyped a password on the Writing
     * submission screen, the Speaking evaluator, the Coach, the exam finishers.
     * Several would then retype their password into a field that was not a
     * password field, or conclude their account had been compromised.
     *
     * apiRequest only surfaces a 401 AFTER its refresh attempt has already
     * failed, so by the time this message is chosen the session really is gone
     * and this is a statement of fact. The login and signup forms do not come
     * through here at all — they use `loginErrorMessage`/`signupErrorMessage`,
     * which still say "Incorrect email or password" where that is the truth.
     */
    case "auth":
      return "Your session has expired. Sign in again to continue.";
    case "quota":
      return "You have used the allowance on your current plan.";
    case "entitlement":
      return "This feature is not available on your current plan.";
    case "noPlan":
      return "Your plan is still being set up. You can continue on Free.";
    case "rate_limit":
      return error.reason === "writing_daily_cap"
        ? "Daily technical limit (20), not your plan quota."
        : error.reason === "speaking_daily_cap"
          ? "Daily technical limit (10 evaluations). This is not your plan quota."
          : "Too many requests. Please wait a moment and try again.";
    case "audio":
      if (error.status === 413) return "That recording is too large (10 MB max).";
      if (/too short/i.test(error.message)) return "Recording is too short.";
      if (/usable/i.test(error.message)) return "We couldn’t evaluate that recording.";
      return error.message || "We couldn’t evaluate that recording.";
    case "missing_client_header":
    case "missing_idempotency_key":
      return "This request could not be completed safely. Refresh the page and try again.";
    case "gone":
      return "That action is no longer available.";
    case "ai":
      switch (error.reason) {
        case "prompt_unavailable":
          return "No writing prompt is available right now.";
        case "ai_timeout":
          return "The evaluator timed out. You were not charged. Try again.";
        case "ai_upstream_error":
          return "The evaluator is unavailable. You were not charged.";
        case "ai_parse_failed":
          return "We couldn’t read the evaluation. You were not charged.";
        case "database_read_failed":
        case "database_write_failed":
          return "We couldn’t save that just now. You were not charged.";
        case "service_unavailable":
          return "Writing evaluation is temporarily unavailable.";
        case "invalid_submission":
          return "That text couldn’t be submitted. Check the length and try again.";
        case "unknown_processing_error":
          return error.correlationId
            ? `Something went wrong evaluating that text. Reference ${error.correlationId}.`
            : "Something went wrong evaluating that text.";
        default:
          return "Evaluation is temporarily unavailable. You were not charged if this failed.";
      }
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
    const speakingCap = input.path?.includes("/speaking/");
    return new FrontendError({
      code: "rate_limit",
      message: "rate_limited",
      status: 429,
      reason: writingCap ? "writing_daily_cap" : speakingCap ? "speaking_daily_cap" : "ip_limit",
      correlationId,
      retryable: true,
    });
  }

  if (input.status === 413 || input.status === 422 || input.status === 415) {
    return new FrontendError({
      code: "audio",
      message: rawError || "audio_error",
      status: input.status,
      reason,
      correlationId,
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
