import { HOME } from "@/content/site/home";
import { Eyebrow, TextLink } from "../primitives";
import { Briefing } from "../visuals/Briefing";
import { SessionPlan } from "../visuals/SessionPlan";

/**
 * The instrument stage: one conceptual beat, one composed focal figure.
 *
 * Intelligence and today's session used to be two full-height duos back to
 * back — two viewports of dark, saying the same thing twice. They are one
 * decision: what is wrong, and therefore what to do today. So they share one
 * heading, one copy block and one figure: the briefing and the plan side by
 * side, joined, reading as a single instrument bank.
 */
export function IntelligenceStage() {
  const s = HOME.stage;
  return (
    <section className="s-section s-stage" id="intelligence" aria-labelledby="intel-title">
      <div className="s-wrap">
        <div className="s-head s-head--split" data-reveal>
          <div>
            <Eyebrow index="05">{s.eyebrow}</Eyebrow>
            <h2 id="intel-title" className="s-h2">
              {s.title}
            </h2>
          </div>
          <div>
            <p className="flow" aria-label="Practice, evaluate, understand, improve">
              {s.flow.map((step, n) => (
                <span key={step}>
                  {n > 0 ? <i aria-hidden="true">→ </i> : null}
                  {step}
                </span>
              ))}
            </p>
            <p className="s-lead">{s.lead}</p>
          </div>
        </div>

        <figure className="stage-bank" data-reveal>
          <div className="stage-panel">
            <p className="stage-label">
              <b>01</b> {s.panels.brief.index}
            </p>
            <Briefing />
          </div>
          <div className="stage-join" aria-hidden="true">
            <span>{s.panels.join}</span>
          </div>
          <div className="stage-panel">
            <p className="stage-label">
              <b>02</b> {s.panels.plan.index}
            </p>
            <SessionPlan />
          </div>
          <figcaption className="s-vh">
            Illustrative: a Reading Intelligence briefing on the left, and the daily session it produces on the right.
          </figcaption>
        </figure>

        <ol className="facts facts--2" data-reveal>
          {s.facts.map((fact, n) => (
            <li key={fact}>
              <span className="facts-n" aria-hidden="true">
                0{n + 1}
              </span>
              <span>{fact}</span>
            </li>
          ))}
        </ol>
        <div className="s-actions" data-reveal>
          <TextLink href="/product#intelligence">Intelligence in detail</TextLink>
        </div>
      </div>
    </section>
  );
}
