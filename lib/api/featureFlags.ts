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
  return {
    ...modules,
    home_v3_enabled: v3 === undefined ? false : asBool(v3, false),
  };
}
