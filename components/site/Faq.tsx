import { JsonLd } from "@/components/marketing/JsonLd";
import { stagger } from "./primitives";

export type FaqEntry = { q: string; a: string[] };

/**
 * Native disclosure widgets, so the accordion works without JavaScript and
 * with every assistive technology, plus FAQPage schema derived from the same
 * data so the markup and the structured data cannot disagree.
 */
export function Faq({ items, schema = true }: { items: FaqEntry[]; schema?: boolean }) {
  return (
    <>
      <div className="faq">
        {items.map((item, i) => (
          <details key={item.q} className="faq-item" data-reveal style={stagger(Math.min(i, 6))}>
            <summary>{item.q}</summary>
            <div className="faq-body">
              {item.a.map((paragraph) => (
                <p key={paragraph} dangerouslySetInnerHTML={{ __html: paragraph }} />
              ))}
            </div>
          </details>
        ))}
      </div>
      {schema ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a.map(stripTags).join(" ") },
            })),
          }}
        />
      ) : null}
    </>
  );
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}
