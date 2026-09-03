import Link from "next/link";
import { HOME } from "@/content/site/home";
import { Cta, Eyebrow, SectionHead, TextLink, stagger } from "../primitives";
import { ExamModes } from "../visuals/ExamModes";
import { OrgRoster } from "../visuals/OrgRoster";

export function ExamSection() {
  const e = HOME.exam;
  return (
    <section className="s-section" id="exam" aria-labelledby="exam-title">
      <div className="s-wrap">
        <div className="duo">
          <div className="duo-copy" data-reveal>
            <Eyebrow index="06">{e.eyebrow}</Eyebrow>
            <h2 id="exam-title" className="s-h2">
              {e.title}
            </h2>
            <p className="s-lead">{e.lead}</p>
            <ol className="facts">
              {e.facts.map((fact, n) => (
                <li key={fact}>
                  <span className="facts-n" aria-hidden="true">
                    0{n + 1}
                  </span>
                  <span>{fact}</span>
                </li>
              ))}
            </ol>
            <div className="s-actions">
              <TextLink href={e.link.href}>{e.link.label}</TextLink>
            </div>
          </div>
          <div className="duo-visual" data-reveal>
            <ExamModes />
          </div>
        </div>
      </div>
    </section>
  );
}

export function Audience() {
  const a = HOME.audience;
  return (
    <section className="s-section s-section--tight s-section--rule" id="audience" aria-labelledby="audience-title">
      <div className="s-wrap">
        <SectionHead index="03" eyebrow={a.eyebrow} title={<span id="audience-title">{a.title}</span>} />
        <ul className="ledger">
          {a.items.map((item, i) => (
            <li key={item.title} className="ledger-item" data-reveal style={stagger(i)}>
              <span className="ledger-n" aria-hidden="true">
                0{i + 1}
              </span>
              <h3 className="s-h3">{item.title}</h3>
              <p>{item.body}</p>
              {"href" in item && item.href ? <TextLink href={item.href}>For academies</TextLink> : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function AcademiesPanel() {
  const a = HOME.academies;
  return (
    <section className="s-section s-section--tight" id="academies" aria-labelledby="academies-title">
      <div className="s-wrap">
        <div className="org" data-reveal>
          <div>
            <Eyebrow index="07">{a.eyebrow}</Eyebrow>
            <h2 id="academies-title" className="s-h2" style={{ marginBottom: 16 }}>
              {a.title}
            </h2>
            <p className="s-body" style={{ marginBottom: 24 }}>
              {a.body}
            </p>
            <div className="s-actions">
              <Cta href={a.cta.href} variant="secondary">
                {a.cta.label}
              </Cta>
              <Link className="s-textlink" href={a.contact.href}>
                {a.contact.label}
              </Link>
            </div>
          </div>
          <OrgRoster />
        </div>
      </div>
    </section>
  );
}

export function Trust() {
  const t = HOME.trust;
  return (
    <section className="s-section s-section--rule" id="method" aria-labelledby="trust-title">
      <div className="s-wrap">
        <SectionHead index="08" eyebrow={t.eyebrow} title={<span id="trust-title">{t.title}</span>} lead={t.lead} split />
        <ol className="ledger ledger--3">
          {t.principles.map((item, i) => (
            <li key={item.title} className="ledger-item" data-reveal style={stagger(i)}>
              <span className="ledger-n" aria-hidden="true">
                0{i + 1}
              </span>
              <h3 className="s-h3">{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ol>
        <ul className="refusals" data-reveal aria-label="What SLP Command will not claim">
          {t.refusals.map((r) => (
            <li key={r.label} className="refusal">
              <b>{r.label}</b>
              <span>{r.body}</span>
            </li>
          ))}
        </ul>
        <div className="s-actions" style={{ marginTop: 28 }} data-reveal>
          {t.links.map((link) => (
            <TextLink key={link.href} href={link.href}>
              {link.label}
            </TextLink>
          ))}
        </div>
      </div>
    </section>
  );
}
