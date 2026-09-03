import type { Metadata } from "next";
import { Faq } from "@/components/site/Faq";
import { PageHero } from "@/components/site/PageHero";
import { AcademyContact } from "@/components/site/AcademyContact";
import { SiteShell } from "@/components/site/SiteShell";
import { Eyebrow, SectionHead, stagger } from "@/components/site/primitives";
import { OrgRoster } from "@/components/site/visuals/OrgRoster";
import { ACADEMIES } from "@/content/site/academies";
import { marketingMetadata } from "@/lib/site";

export const metadata: Metadata = marketingMetadata("academies");

export default function AcademiesPage() {
  const a = ACADEMIES;
  return (
    <SiteShell>
      <PageHero
        eyebrow={a.head.eyebrow}
        title={a.head.title}
        lead={a.head.lead}
        primary={a.head.primary}
        secondary={a.head.secondary}
        notes={a.head.notes}
        aside={
          <div className="s-panel" style={{ padding: 18 }}>
            <p className="s-eyebrow" style={{ marginBottom: 12 }}>
              Cohort view · illustrative
            </p>
            <OrgRoster />
          </div>
        }
      />

      <section className="s-section s-section--band" aria-labelledby="status-title">
        <div className="s-wrap">
          <SectionHead index="01" eyebrow={a.status.eyebrow} title={<span id="status-title">{a.status.title}</span>} split />
          <div className="ledger ledger--2">
            <div className="ledger-item" data-reveal>
              <span className="ledger-n">In early access today</span>
              <ul className="skill-points" style={{ ["--tint" as string]: "var(--s-ok)" } as React.CSSProperties}>
                {a.status.exists.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="ledger-item" data-reveal style={stagger(1)}>
              <span className="ledger-n">Not yet</span>
              <ul className="skill-points" style={{ ["--tint" as string]: "var(--s-signal)" } as React.CSSProperties}>
                {a.status.notYet.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="s-section" aria-labelledby="how-title">
        <div className="s-wrap">
          <SectionHead index="02" eyebrow={a.how.eyebrow} title={<span id="how-title">{a.how.title}</span>} split />
          <ol className="ledger">
            {a.how.steps.map((step, i) => (
              <li key={step.title} className="ledger-item" data-reveal style={stagger(i)}>
                <span className="ledger-n" aria-hidden="true">
                  0{i + 1}
                </span>
                <h3 className="s-h3">{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="s-section s-section--band" aria-labelledby="who-title">
        <div className="s-wrap">
          <SectionHead index="03" eyebrow={a.audience.eyebrow} title={<span id="who-title">Academies, units and training providers.</span>} />
          <ul className="ledger ledger--3">
            {a.audience.items.map((item, i) => (
              <li key={item.title} className="ledger-item" data-reveal style={stagger(i)}>
                <span className="ledger-n" aria-hidden="true">
                  0{i + 1}
                </span>
                <h3 className="s-h3">{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="s-section" id="faq" aria-labelledby="afaq-title">
        <div className="s-wrap s-wrap--narrow">
          <div className="s-head s-head--center" data-reveal>
            <div>
              <Eyebrow bare>Questions</Eyebrow>
              <h2 id="afaq-title" className="s-h2">
                For organisations
              </h2>
            </div>
          </div>
          <Faq items={a.faq} />
        </div>
      </section>

      <AcademyContact />
    </SiteShell>
  );
}
