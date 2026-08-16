import type { ReactNode } from "react";
import { displayValue } from "@/lib/admin/format";

function tileValue(value: ReactNode | unknown): ReactNode {
  if (value == null || value === "") return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && value !== null && "$$typeof" in (value as object)) return value as ReactNode;
  return displayValue(value);
}

export function Tile({ value, label, info }: { value: ReactNode | unknown; label: string; info?: string }) {
  return (
    <div className="admin-tile">
      <div className="n">{tileValue(value)}</div>
      <div className="l">
        {label}
        {info ? (
          <span className="admin-muted" title={info} style={{ cursor: "help" }}>
            {" "}
            ⓘ
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="admin-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function Dot({ status }: { status: string }) {
  const cls = status === "green" || status === "ok" || status === "OK" ? "ok" : status === "amber" || status === "WARNING" || status === "degraded" ? "degraded" : "down";
  return <span className={`admin-dot ${cls}`} aria-hidden="true" />;
}

export function NA() {
  return <span className="admin-muted">Not available yet</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="admin-muted" style={{ fontSize: 13 }}>{children}</p>;
}

export function Value({ value, fallback = "—" }: { value: unknown; fallback?: string }) {
  return <>{displayValue(value, fallback)}</>;
}
