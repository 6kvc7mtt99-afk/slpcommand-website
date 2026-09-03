import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/** Mono, tracked, with a short rule. `index` renders as "01 — Label". */
export function Eyebrow({
  children,
  index,
  bare,
  className,
}: {
  children: ReactNode;
  index?: string;
  bare?: boolean;
  className?: string;
}) {
  return (
    <p className={["s-eyebrow", bare ? "s-eyebrow--bare" : "", className ?? ""].join(" ").trim()}>
      {index ? <b>{index}</b> : null}
      {index ? <span aria-hidden="true">—</span> : null}
      <span>{children}</span>
    </p>
  );
}

export function SectionHead({
  index,
  eyebrow,
  title,
  lead,
  align = "left",
  split,
  children,
}: {
  index?: string;
  eyebrow: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  split?: boolean;
  children?: ReactNode;
}) {
  const className = ["s-head", align === "center" ? "s-head--center" : "", split ? "s-head--split" : ""]
    .join(" ")
    .trim();
  return (
    <div className={className} data-reveal>
      <div>
        <Eyebrow index={index} bare={align === "center"}>
          {eyebrow}
        </Eyebrow>
        <h2 className="s-h2">{title}</h2>
      </div>
      {lead ? <p className="s-lead">{lead}</p> : null}
      {children}
    </div>
  );
}

export function Arrow() {
  return (
    <span className="s-arrow" aria-hidden="true">
      →
    </span>
  );
}

export function Cta({
  href,
  children,
  variant = "primary",
  size,
  block,
  arrow = true,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  size?: "sm";
  block?: boolean;
  arrow?: boolean;
}) {
  const className = ["s-btn", `s-btn--${variant}`, size ? `s-btn--${size}` : "", block ? "s-btn--block" : ""]
    .join(" ")
    .trim();
  return (
    <Link className={className} href={href}>
      {children}
      {arrow ? <Arrow /> : null}
    </Link>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="s-textlink" href={href}>
      {children}
      <Arrow />
    </Link>
  );
}

export function Tag({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: "signal" | "accent" | "ok";
}) {
  return <span className={["s-tag", tone ? `s-tag--${tone}` : ""].join(" ").trim()}>{children}</span>;
}

/** Inline style helper for the stagger index custom property. */
export function stagger(i: number): CSSProperties {
  return { ["--i" as string]: i } as CSSProperties;
}
