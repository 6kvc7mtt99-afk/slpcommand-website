import Link from "next/link";
import { HOME } from "@/content/site/home";
import { Faq } from "../Faq";
import { PricingPlans } from "../PricingPlans";
import { Arrow, Eyebrow, SectionHead, TextLink } from "../primitives";

export function PricingSection() {
  const p = HOME.pricing;
  return (
    <section className="s-section s-section--band" id="pricing" aria-labelledby="pricing-title">
      <div className="s-wrap">
        <SectionHead index="09" eyebrow={p.eyebrow} title={<span id="pricing-title">{p.title}</span>} lead={p.lead} align="center" />
        <PricingPlans />
        <div className="s-actions s-actions--center" style={{ marginTop: 28 }} data-reveal>
          <TextLink href={p.link.href}>{p.link.label}</TextLink>
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section className="s-section" id="faq" aria-labelledby="faq-title">
      <div className="s-wrap s-wrap--narrow">
        <SectionHead index="10" eyebrow="Questions" title={<span id="faq-title">Before you start</span>} align="center" />
        <Faq items={HOME.faq} />
      </div>
    </section>
  );
}

export function Closing() {
  const c = HOME.closing;
  return (
    <section className="s-stage closing" aria-labelledby="closing-title">
      <div className="s-wrap" data-reveal>
        <Eyebrow bare className="s-eyebrow" >
          {c.eyebrow}
        </Eyebrow>
        <h2 id="closing-title" className="s-display">
          {c.title}
        </h2>
        <p className="s-lead">{c.lead}</p>
        <div className="s-actions">
          <Link className="s-btn s-btn--primary" href={c.primary.href}>
            {c.primary.label}
            <Arrow />
          </Link>
          <Link className="s-btn s-btn--secondary" href={c.secondary.href}>
            {c.secondary.label}
          </Link>
        </div>
        <p className="s-actions-note">
          {c.notes.map((note) => (
            <span key={note}>{note}</span>
          ))}
        </p>
      </div>
    </section>
  );
}
