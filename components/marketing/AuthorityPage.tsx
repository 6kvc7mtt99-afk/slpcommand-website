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
import { SiteFooter, SiteHeader } from "./SiteChrome";

export function AuthorityPage({ id }: { id: AuthorityId }) {
  const page = getAuthorityPage(id);
  const trail = breadcrumbTrail(page);
  const convert = conversionCta(page.lang);
  return (
    <>
      <SiteHeader />
      <article className="wrap authority" lang={page.lang}>
        <nav className="authority-crumbs" aria-label="Breadcrumb">
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

        <p className="authority-kicker">{page.kicker}</p>
        <h1>{page.h1}</h1>
        <p className="updated">
          Updated {page.updated} · Independent educational resource
        </p>

        {page.sections.map((section) => (
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
                    {term.aka?.length ? (
                      <p className="glossary-aka">Also written: {term.aka.join(" · ")}</p>
                    ) : null}
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
            <div className="faq-list">
              {page.faq.map((item) => (
                <details key={item.q} className="faq-item">
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {page.sources?.length ? (
          <section className="authority-sources">
            <h2>{page.lang === "es" ? "Fuentes" : "Sources"}</h2>
            <ol>
              {page.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} rel="noopener noreferrer nofollow" target="_blank">
                    {source.label}
                  </a>
                  {source.note ? <span className="source-note">{source.note}</span> : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <aside className="authority-cta">
          <h2>{convert.heading}</h2>
          <p>{convert.body}</p>
          <div className="authority-cta-actions">
            <Link className="btn btn-primary" href={convert.href}>
              {convert.label}
            </Link>
            <Link className="btn btn-outline" href={page.cta.href}>
              {page.cta.label}
            </Link>
          </div>
          <p className="authority-cta-note">{convert.note}</p>
        </aside>

        <nav className="authority-related" aria-label="Related guides">
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
      <SiteFooter />
      <JsonLd data={articleJsonLd(id)} />
      <JsonLd data={breadcrumbJsonLd(id)} />
      <JsonLd data={faqJsonLd(id)} />
      <JsonLd data={glossaryJsonLd(id)} />
    </>
  );
}
