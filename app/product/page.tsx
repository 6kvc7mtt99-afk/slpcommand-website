import type { Metadata } from "next";
import Link from "next/link";
import { Faq } from "@/components/site/Faq";
import { ClosingBeat, PageHero } from "@/components/site/PageHero";
import { SiteShell } from "@/components/site/SiteShell";
import { Eyebrow, SectionHead, TextLink, stagger } from "@/components/site/primitives";
import { Briefing } from "@/components/site/visuals/Briefing";
import { SessionPlan } from "@/components/site/visuals/SessionPlan";
import { ListeningFragment, ReadingFragment, SpeakingFragment, WritingFragment } from "@/components/site/visuals/SkillFragments";
import { TrainingLoop } from "@/components/site/visuals/TrainingLoop";
import { HOME } from "@/content/site/home";
import { PRODUCT } from "@/content/site/product";
import { marketingMetadata } from "@/lib/site";

export const metadata: Metadata = marketingMetadata("product");

const FRAGMENTS = {
  reading: ReadingFragment,
  listening: ListeningFragment,
  writing: WritingFragment,
  speaking: SpeakingFragment,
} as const;

export default function ProductPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow={PRODUCT.head.eyebrow}
        title={PRODUCT.head.title}
        lead={PRODUCT.head.lead}
        primary={PRODUCT.head.primary}
        secondary={PRODUCT.head.secondary}
        notes={HOME.hero.notes}
        aside={
          /* The same Writing and Speaking fragments the skill panels use — the
             two surfaces where the AI assessment is visible — so the first
             screen shows what the product returns, not a gradient. */
          <figure className="s-panel hero-frags" role="group" aria-labelledby="hero-frags-caption">
            <figcaption id="hero-frags-caption" className="s-eyebrow">
              {PRODUCT.head.asideLabel}
            </figcaption>
            <div className="hero-frag" style={{ ["--tint" as string]: "var(--s-writing)" } as React.CSSProperties}>
              <WritingFragment />
            </div>
            <div className="hero-frag" style={{ ["--tint" as string]: "var(--s-speaking)" } as React.CSSProperties}>
              <SpeakingFragment />
            </div>
          </figure>
        }
      />

      <section className="s-section s-section--band s-section--tight" aria-labelledby="loop-title">
        <div className="s-wrap">
          <SectionHead eyebrow={HOME.system.eyebrow} title={<span id="loop-title">{HOME.system.title}</span>} lead={HOME.system.lead} split />
          <TrainingLoop nodes={HOME.system.nodes} returnLabel={HOME.system.returnLabel} />
        </div>
      </section>

      {PRODUCT.skills.map((skill, i) => {
        const Fragment = FRAGMENTS[skill.key as keyof typeof FRAGMENTS];
        const flip = i % 2 === 1;
        return (
          <section key={skill.key} className={`s-section${i > 0 ? " s-section--rule" : ""}`} id={skill.key} aria-labelledby={`${skill.key}-title`}>
            <div className="s-wrap">
              <div className={`duo${flip ? " duo--flip" : ""}`}>
                <div className="duo-copy" data-reveal>
                  <Eyebrow index={skill.index}>{skill.name}</Eyebrow>
                  <h2 id={`${skill.key}-title`} className="s-h2">
                    {skill.title}
                  </h2>
                  <p className="flow" aria-label={`${skill.name} modes`}>
                    {skill.modes.map((mode, n) => (
                      <span key={mode}>
                        {n > 0 ? <i aria-hidden="true">· </i> : null}
                        {mode}
                      </span>
                    ))}
                  </p>
                  <p className="s-lead">{skill.lead}</p>
                  <ol className="facts">
                    {skill.facts.map((fact, n) => (
                      <li key={fact}>
                        <span className="facts-n" aria-hidden="true">
                          0{n + 1}
                        </span>
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="s-actions">
                    <TextLink href={skill.guide.href}>{skill.guide.label}</TextLink>
                  </div>
                </div>
                <div className="duo-visual" data-reveal>
                  <div className={`skill skill--${skill.key}`} style={{ padding: 24 }}>
                    <Fragment />
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      <section className="s-section s-stage" id="intelligence" aria-labelledby="pi-title">
        <div className="s-wrap">
          <div className="duo">
            <div className="duo-copy" data-reveal>
              <Eyebrow index="05">{PRODUCT.intelligence.eyebrow}</Eyebrow>
              <h2 id="pi-title" className="s-h2">
                {PRODUCT.intelligence.title}
              </h2>
              <p className="s-lead">{PRODUCT.intelligence.lead}</p>
              <ol className="facts">
                {PRODUCT.intelligence.facts.map((fact, n) => (
                  <li key={fact}>
                    <span className="facts-n" aria-hidden="true">
                      0{n + 1}
                    </span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="duo-visual" data-reveal>
              <Briefing />
            </div>
          </div>
          <div className="duo duo--flip" id="session">
            <div className="duo-copy" data-reveal>
              <Eyebrow index="06">{PRODUCT.session.eyebrow}</Eyebrow>
              <h2 className="s-h2">{PRODUCT.session.title}</h2>
              <p className="s-lead">{PRODUCT.session.lead}</p>
              <ol className="facts">
                {PRODUCT.session.facts.map((fact, n) => (
                  <li key={fact}>
                    <span className="facts-n" aria-hidden="true">
                      0{n + 1}
                    </span>
                    <span>{fact}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="duo-visual" data-reveal>
              <SessionPlan />
            </div>
          </div>
        </div>
      </section>

      <section className="s-section" id="platform" aria-labelledby="platform-title">
        <div className="s-wrap">
          <SectionHead index="07" eyebrow={PRODUCT.platform.eyebrow} title={<span id="platform-title">{PRODUCT.platform.title}</span>} />
          <ul className="ledger ledger--3">
            {PRODUCT.platform.facts.map((item, i) => (
              <li key={item.title} className="ledger-item" data-reveal style={stagger(i)}>
                <span className="ledger-n" aria-hidden="true">
                  0{i + 1}
                </span>
                <h3 className="s-h3">{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ul>
          <p className="s-small" style={{ marginTop: 24 }}>
            Independent trainer — not an official STANAG 6001 assessment. <Link className="s-link" href="/method">How we measure</Link>.
          </p>
        </div>
      </section>

      <section className="s-section s-section--band" id="faq" aria-labelledby="pfaq-title">
        <div className="s-wrap s-wrap--narrow">
          <SectionHead eyebrow="Questions" title={<span id="pfaq-title">About the trainer</span>} align="center" />
          <Faq items={PRODUCT.faq} />
        </div>
      </section>

      <ClosingBeat {...PRODUCT.closing} />
    </SiteShell>
  );
}
