import Link from "next/link";
import { HOME } from "@/content/site/home";
import { SectionHead, TextLink, stagger } from "../primitives";
import { TrainingLoop } from "../visuals/TrainingLoop";
import { ListeningFragment, ReadingFragment, SpeakingFragment, WritingFragment } from "../visuals/SkillFragments";

export function Problem() {
  const p = HOME.problem;
  return (
    <section className="s-section s-section--band" id="problem" aria-labelledby="problem-title">
      <div className="s-wrap">
        <SectionHead index="01" eyebrow={p.eyebrow} title={<span id="problem-title">{p.title}</span>} lead={p.lead} split />
        <ol className="ledger">
          {p.items.map((item, i) => (
            <li key={item.title} className="ledger-item" data-reveal style={stagger(i)}>
              <span className="ledger-n" aria-hidden="true">
                0{i + 1}
              </span>
              <h3 className="s-h3">{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function System() {
  const s = HOME.system;
  return (
    <section className="s-section" id="how" aria-labelledby="system-title">
      <div className="s-wrap">
        <SectionHead index="02" eyebrow={s.eyebrow} title={<span id="system-title">{s.title}</span>} lead={s.lead} split />
        <TrainingLoop nodes={s.nodes} returnLabel={s.returnLabel} />
      </div>
    </section>
  );
}

const FRAGMENTS = {
  reading: ReadingFragment,
  listening: ListeningFragment,
  writing: WritingFragment,
  speaking: SpeakingFragment,
} as const;

export function Skills() {
  const s = HOME.skills;
  return (
    <section className="s-section s-section--rule" id="skills" aria-labelledby="skills-title">
      <div className="s-wrap">
        <SectionHead index="04" eyebrow={s.eyebrow} title={<span id="skills-title">{s.title}</span>} lead={s.lead} split />
        <div className="skills">
          {s.items.map((skill, i) => {
            const Fragment = FRAGMENTS[skill.key as keyof typeof FRAGMENTS];
            return (
              <article key={skill.key} className={`skill skill--${skill.key}`} data-reveal style={stagger(i)} aria-labelledby={`skill-${skill.key}`}>
                <div className="skill-head">
                  <h3 id={`skill-${skill.key}`} className="s-h3">
                    {skill.name}
                  </h3>
                  <span className="skill-modes">{skill.modes}</span>
                </div>
                <Fragment />
                <ul className="skill-points">
                  {skill.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <div className="skill-foot">
                  <TextLink href={`/product#${skill.key}`}>{skill.name} in detail</TextLink>
                  <Link className="s-small" href={skill.guide}>
                    What the {skill.name.toLowerCase()} rater judges
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
