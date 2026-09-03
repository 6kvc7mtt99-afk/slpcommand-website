import Link from "next/link";
import { PLAN_CARDS, PLAN_ROWS, PRICING_NOTE, PRO_PLAN } from "@/content/site/pricing";
import { Arrow, stagger } from "./primitives";

export function PricingPlans({ note = true }: { note?: boolean }) {
  const cards = [PLAN_CARDS.free, PLAN_CARDS.pro];
  return (
    <>
      <div className="plans">
        {cards.map((plan, i) => {
          const featured = plan.name === PRO_PLAN.name;
          return (
            <article key={plan.name} className={`plan${featured ? " plan--featured" : ""}`} data-reveal style={stagger(i)} aria-labelledby={`plan-${i}`}>
              {featured ? <span className="plan-badge">Most complete</span> : null}
              <h3 id={`plan-${i}`} className="plan-name">
                {plan.name}
              </h3>
              <p className="plan-price">
                <b>{plan.price}</b>
                <span>/ {plan.period}</span>
              </p>
              <p className="plan-desc">{plan.description}</p>
              <ul className="plan-list">
                {plan.features.map((feature) => (
                  <li key={feature.label}>
                    <span>{feature.label}</span>
                    <b className={featured ? "is-pro" : ""}>{feature.value}</b>
                  </li>
                ))}
              </ul>
              <Link className={`s-btn ${featured ? "s-btn--primary" : "s-btn--secondary"} s-btn--block`} href={plan.cta.href} data-plan-cta={plan.name.toLowerCase()}>
                {plan.cta.label}
                <Arrow />
              </Link>
              <p className="plan-fine">{plan.fine}</p>
            </article>
          );
        })}
      </div>
      {note ? <p className="plans-note">{PRICING_NOTE}</p> : null}
    </>
  );
}

export function PricingCompare() {
  return (
    <div className="compare-wrap" data-reveal role="region" aria-label="Plan comparison table, scrolls horizontally on small screens" tabIndex={0}>
      <table className="compare">
        <caption className="s-vh">Every allowance on the Free and Professional plans</caption>
        <thead>
          <tr>
            <th scope="col">Allowance</th>
            <th scope="col">Free</th>
            <th scope="col">{PRO_PLAN.name}</th>
          </tr>
        </thead>
        <tbody>
          {PLAN_ROWS.map((group) => (
            <GroupRows key={group.group} group={group.group} rows={group.rows} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupRows({ group, rows }: { group: string; rows: { label: string; free: string; pro: string; proHighlight?: boolean }[] }) {
  return (
    <>
      <tr className="compare-group">
        <th scope="colgroup" colSpan={3}>
          {group}
        </th>
      </tr>
      {rows.map((row) => (
        <tr key={row.label}>
          <th scope="row">{row.label}</th>
          <td>{row.free}</td>
          <td className={row.proHighlight ? "is-pro" : ""}>{row.pro}</td>
        </tr>
      ))}
    </>
  );
}
