export function esc(value: unknown): string {
  return String(value == null ? "" : value).replace(/[&<>"]/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    return "&quot;";
  });
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function displayValue(value: unknown, fallback = "—"): string {
  if (value == null || value === "") return fallback;
  return String(value);
}

export function shortId(value: unknown, keep = 8): string {
  const text = displayValue(value, "");
  if (!text) return "—";
  return text.length > keep ? `${text.slice(0, keep)}…` : text;
}

export function formatWhen(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export function formatDay(value: unknown): string {
  if (!value) return "—";
  return String(value).slice(0, 10);
}

export function healthDot(status: unknown): "ok" | "degraded" | "down" {
  if (status === "ok" || status === "green" || status === true) return "ok";
  if (status === "degraded" || status === "amber" || status === "WARNING") return "degraded";
  return "down";
}

export function modeClass(mode: unknown): string {
  if (mode === "healthy") return "mode-healthy";
  if (mode === "degraded") return "mode-degraded";
  if (mode === "outage") return "mode-outage";
  return "mode-degraded";
}
