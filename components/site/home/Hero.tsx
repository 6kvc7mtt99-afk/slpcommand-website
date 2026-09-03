import Link from "next/link";
import { HOME } from "@/content/site/home";
import { Arrow, Eyebrow } from "../primitives";
import { ProfileInstrument } from "../visuals/ProfileInstrument";

export function Hero() {
  const h = HOME.hero;
  return (
    <section className="s-hero" aria-labelledby="hero-title">
      <div className="s-wrap">
        <div className="s-hero-grid">
          <div className="s-hero-copy">
            <div data-hero="1">
              <Eyebrow>{h.eyebrow}</Eyebrow>
            </div>
            <h1 id="hero-title" className="s-display" data-hero="2">
              {h.title}
            </h1>
            <p className="s-lead" data-hero="3">
              {h.lead}
            </p>
            <div className="s-actions" data-hero="4">
              <Link className="s-btn s-btn--primary" href={h.primary.href}>
                {h.primary.label}
                <Arrow />
              </Link>
              <Link className="s-btn s-btn--secondary" href={h.secondary.href}>
                {h.secondary.label}
              </Link>
            </div>
            <p className="s-actions-note" data-hero="5">
              {h.notes.map((note) => (
                <span key={note}>{note}</span>
              ))}
            </p>
          </div>
          <div className="s-hero-visual">
            <ProfileInstrument />
            <p className="s-hero-caption" data-hero="5">
              {h.caption}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
