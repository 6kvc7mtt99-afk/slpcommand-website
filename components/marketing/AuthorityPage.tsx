import Link from "next/link";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  breadcrumbTrail,
  faqJsonLd,
  type AuthorityId,
  getAuthorityPage,
} from "@/lib/authority";
import { JsonLd } from "./JsonLd";
import { SiteFooter, SiteHeader } from "./SiteChrome";

export function AuthorityPage({ id }: { id: AuthorityId }) {
  const page = getAuthorityPage(id);
  const trail = breadcrumbTrail(page);
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

        <aside className="authority-cta">
          <h2>{page.cta.heading}</h2>
          <p>{page.cta.body}</p>
          <Link className="btn btn-primary" href={page.cta.href}>
            {page.cta.label}
          </Link>
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
    </>
  );
}
