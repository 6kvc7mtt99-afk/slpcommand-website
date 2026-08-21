import { asBool, isRecord } from "./decode";
import type { FeatureFlags } from "./types";

const MODULE_KEYS = [
  "reading_enabled",
  "listening_enabled",
  "writing_enabled",
  "speaking_enabled",
  "academy_enabled",
] as const;

function readFlag(source: Record<string, unknown>, key: string): unknown {
  if (key in source) return source[key];
  const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  if (camel in source) return source[camel];
  return undefined;
}

function unwrap(raw: unknown): Record<string, unknown> {
  if (!isRecord(raw)) return {};
  if (isRecord(raw.flags)) return raw.flags;
  if (isRecord(raw.featureFlags)) return raw.featureFlags;
  return raw;
}

export function decodeFeatureFlags(raw: unknown): FeatureFlags {
  const source = unwrap(raw);
  const modules = {} as Pick<FeatureFlags, (typeof MODULE_KEYS)[number]>;
  for (const key of MODULE_KEYS) {
    const value = readFlag(source, key);
    modules[key] = value === undefined ? true : asBool(value, true);
  }
  const v3 = readFlag(source, "home_v3_enabled");
  /**
   * THE BILLING KILL SWITCH — and it fails CLOSED.
   *
   * Module flags above default to `true` when absent, which is right for
   * them: a flags call that times out should not take Reading off the
   * product. Billing is the opposite. A checkout that appears because a flag
   * lookup failed is the worst possible way to discover a billing bug, so an
   * absent, unreadable or non-boolean value means NO CHECKOUT — same posture
   * as `home_v3_enabled`, for a much sharper reason.
   *
   * Turning it on and off is a database row in `feature_flags`, not a
   * deploy. Off does not revoke anything: entitlements already granted stay
   * granted, because this flag gates the way IN to a purchase and nothing
   * about what a purchase produced.
   */
  const webBilling = readFlag(source, "web_billing_enabled");
  return {
    ...modules,
    home_v3_enabled: v3 === undefined ? false : asBool(v3, false),
    web_billing_enabled: webBilling === undefined ? false : asBool(webBilling, false),
  };
}
