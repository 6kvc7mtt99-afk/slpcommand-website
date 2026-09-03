import Link from "next/link";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  breadcrumbTrail,
  faqJsonLd,
  glossaryJsonLd,
  type AuthorityId,
  getAuthorityPage,
} from "@/lib/authority";
import { GLOSSARY_STATUS_LABEL, GLOSSARY_STATUS_NOTE } from "@/content/glossary";
import { conversionCta } from "@/lib/conversion";
import { JsonLd } from "./JsonLd";
import { SiteShell } from "@/components/site/SiteShell";
import { Arrow } from "@/components/site/primitives";

/**
 * The independence note is authored inside each page's first section. It reads
 * better as the article's standfirst — before the first H2 — so it is lifted
 * out here and rendered once, under the dateline.
 */
const NOTE = /<p class="note">[\s\S]*?<\/p>\s*/;

export function AuthorityPage({ id }: { id: AuthorityId }) {
  const page = getAuthorityPage(id);
  const trail = breadcrumbTrail(page);
  const convert = conversionCta(page.lang);
  const first = page.sections[0];
  const noteMatch = first?.html.match(NOTE);
  const note = noteMatch ? noteMatch[0] : null;
  const sections = note ? [{ ...first, html: first.html.replace(NOTE, "") }, ...page.sections.slice(1)] : page.sections;

  return (
    <SiteShell>
      <article className="s-wrap article" lang={page.lang}>
        <nav className="crumbs" aria-label="Breadcrumb">
          {trail.map((crumb, index) =>
            index === trail.length - 1 ? (
              <span key={crumb.path} aria-current="page">
                {crumb.name}
              </span>
            ) : (
              <span key={crumb.path}>
                <Link href={crumb.path}>{crumb.name}</Link>
                <span aria-hidden="true"> / </span>
              </span>
            ),
          )}
        </nav>

        <header className="article-head">
          <p className="s-eyebrow">{page.kicker}</p>
          <h1>{page.h1}</h1>
          <p className="updated">
            {page.lang === "es" ? "Actualizado" : "Updated"} {page.updated} ·{" "}
            {page.lang === "es" ? "Recurso educativo independiente" : "Independent educational resource"}
          </p>
        </header>

        <div className="article-body">
          {note ? <div dangerouslySetInnerHTML={{ __html: note }} /> : null}

          {sections.map((section) => (
            <section key={section.h2}>
              <h2>{section.h2}</h2>
              <div dangerouslySetInnerHTML={{ __html: section.html }} />
            </section>
          ))}

          {page.glossary?.length ? (
            <section className="glossary">
              <h2>Terms</h2>
              <dl className="glossary-list">
                {page.glossary.map((term) => (
                  <div key={term.id} id={term.id} className="glossary-entry">
                    <dt>
                      <a className="glossary-anchor" href={`#${term.id}`}>
                        {term.term}
                      </a>
                      <span className={`glossary-status is-${term.status}`} title={GLOSSARY_STATUS_NOTE[term.status]}>
                        {GLOSSARY_STATUS_LABEL[term.status]}
                      </span>
                    </dt>
                    <dd>
                      <p className="glossary-short">{term.short}</p>
                      {term.body ? <div dangerouslySetInnerHTML={{ __html: term.body }} /> : null}
                      {term.aka?.length ? <p className="glossary-aka">Also written: {term.aka.join(" · ")}</p> : null}
                      {term.see?.length ? (
                        <p className="glossary-see">
                          {term.see.map((link, index) => (
                            <span key={link.href}>
                              {index > 0 ? <span aria-hidden="true"> · </span> : null}
                              <Link href={link.href}>{link.label}</Link>
                            </span>
                          ))}
                        </p>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {page.faq.length > 0 ? (
            <section>
              <h2>{page.lang === "es" ? "Preguntas" : "Questions"}</h2>
              <div className="faq">
                {page.faq.map((item) => (
                  <details key={item.q} className="faq-item">
                    <summary>{item.q}</summary>
                    <div className="faq-body">
                      <p>{item.a}</p>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          {page.sources?.length ? (
            <section className="sources">
              <h2>{page.lang === "es" ? "Fuentes" : "Sources"}</h2>
              <ol>
                {page.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} rel="noopener noreferrer nofollow" target="_blank">
                      {source.label}
                      <span className="s-vh"> ({page.lang === "es" ? "se abre en una pestaña nueva" : "opens in a new tab"})</span>
                    </a>
                    {source.note ? <span className="source-note">{source.note}</span> : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>

        <aside className="article-aside" aria-labelledby="article-cta">
          <h2 id="article-cta">{convert.heading}</h2>
          <p>{convert.body}</p>
          <div className="s-actions">
            <Link className="s-btn s-btn--primary" href={convert.href}>
              {convert.label}
              <Arrow />
            </Link>
            <Link className="s-btn s-btn--secondary" href={page.cta.href}>
              {page.cta.label}
            </Link>
          </div>
          <p className="s-actions-note">
            <span>{convert.note}</span>
          </p>
        </aside>

        <nav className="article-related" aria-label={page.lang === "es" ? "Páginas relacionadas" : "Related guides"}>
          <h2>{page.lang === "es" ? "Sigue leyendo" : "Related"}</h2>
          <ul>
            {page.related.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
      <JsonLd data={articleJsonLd(id)} />
      <JsonLd data={breadcrumbJsonLd(id)} />
      <JsonLd data={faqJsonLd(id)} />
      <JsonLd data={glossaryJsonLd(id)} />
    </SiteShell>
  );
}
