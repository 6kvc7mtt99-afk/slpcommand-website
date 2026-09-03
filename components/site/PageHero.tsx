import Link from "next/link";
import type { ReactNode } from "react";
import { Arrow, Eyebrow } from "./primitives";

/**
 * The opening beat of a secondary marketing page: eyebrow, title, lead, two
 * actions, and an optional product visual in the aside slot.
 *
 * `compact` trims the vertical padding for pages whose first screen must
 * carry something below the hero — the pricing page's plan cards, above all.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  primary,
  secondary,
  notes,
  aside,
  compact,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
  notes?: readonly string[];
  aside?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={`s-hero${compact ? " s-hero--compact" : ""}`} aria-labelledby="page-title">
      <div className="s-wrap">
        <div className={aside ? "s-hero-grid" : ""}>
          <div className="s-hero-copy">
            <div data-hero="1">
              <Eyebrow>{eyebrow}</Eyebrow>
            </div>
            <h1 id="page-title" className="s-display" data-hero="2">
              {title}
            </h1>
            <p className="s-lead" data-hero="3">
              {lead}
            </p>
            {primary || secondary ? (
              <div className="s-actions" data-hero="4">
                {primary ? (
                  <Link className="s-btn s-btn--primary" href={primary.href}>
                    {primary.label}
                    <Arrow />
                  </Link>
                ) : null}
                {secondary ? (
                  <Link className="s-btn s-btn--secondary" href={secondary.href}>
                    {secondary.label}
                  </Link>
                ) : null}
              </div>
            ) : null}
            {notes?.length ? (
              <p className="s-actions-note" data-hero="5">
                {notes.map((note) => (
                  <span key={note}>{note}</span>
                ))}
              </p>
            ) : null}
          </div>
          {aside ? (
            <div className="s-hero-visual" data-hero="visual">
              {aside}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function ClosingBeat({
  eyebrow,
  title,
  lead,
  primary,
  secondary,
  notes,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  notes?: readonly string[];
}) {
  return (
    <section className="s-stage closing" aria-labelledby="closing-title">
      <div className="s-wrap" data-reveal>
        <Eyebrow bare>{eyebrow}</Eyebrow>
        <h2 id="closing-title" className="s-display">
          {title}
        </h2>
        <p className="s-lead">{lead}</p>
        <div className="s-actions">
          <Link className="s-btn s-btn--primary" href={primary.href}>
            {primary.label}
            <Arrow />
          </Link>
          {secondary ? (
            <Link className="s-btn s-btn--secondary" href={secondary.href}>
              {secondary.label}
            </Link>
          ) : null}
        </div>
        {notes?.length ? (
          <p className="s-actions-note">
            {notes.map((note) => (
              <span key={note}>{note}</span>
            ))}
          </p>
        ) : null}
      </div>
    </section>
  );
}
