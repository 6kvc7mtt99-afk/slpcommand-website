import Link from "next/link";
import { ACADEMIES } from "@/content/site/academies";
import { Arrow, Eyebrow } from "./primitives";

/**
 * The academies next action.
 *
 * There is no form backend and no sales desk, so this does not pretend to be
 * either: it is a framed email, at the general contact address the Legal
 * Notice and the Contact page already publish, with the context we need to
 * reply usefully pre-filled in the message. The same fields are listed on the
 * page so a director who prefers their own mail client knows what to send.
 */
export function AcademyContact() {
  const c = ACADEMIES.contact;
  const body = [
    "Hello,",
    "",
    "We are interested in early access to SLP Command for our organisation.",
    "",
    ...c.fields.map((field) => `${field.label}: `),
    "",
  ].join("\n");
  const mailto = `mailto:${c.email}?subject=${encodeURIComponent(c.subject)}&body=${encodeURIComponent(body)}`;

  return (
    <section className="s-section s-stage" id="contact" aria-labelledby="contact-title">
      <div className="s-wrap">
        <div className="ea" data-reveal>
          <div className="ea-copy">
            <Eyebrow>{c.eyebrow}</Eyebrow>
            <h2 id="contact-title" className="s-h2">
              {c.title}
            </h2>
            <p className="s-lead">{c.body}</p>
            <div className="s-actions">
              <a className="s-btn s-btn--primary" href={mailto}>
                {c.primaryLabel}
                <Arrow />
              </a>
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
          <div className="ea-fields s-panel">
            <p className="s-eyebrow">What helps us reply usefully</p>
            <ol className="ea-list">
              {c.fields.map((field, i) => (
                <li key={field.label}>
                  <span className="ea-n" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <span>
                    <b>{field.label}</b>
                    <span className="ea-hint">{field.hint}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="ea-address">
              <span className="s-eyebrow s-eyebrow--bare">Or write directly</span>
              <a href={`mailto:${c.email}`}>{c.email}</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
