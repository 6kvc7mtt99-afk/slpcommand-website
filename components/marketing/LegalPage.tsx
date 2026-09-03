import { SiteShell } from "@/components/site/SiteShell";

/**
 * A legal document inside the public shell.
 *
 * Each document carries its own brand masthead (`.page-header`), written when
 * these files were standalone HTML pages. The site header is now the only
 * masthead, so that block is removed at render time rather than by editing
 * fourteen legal texts.
 */
const OWN_MASTHEAD = /<div class="page-header">[\s\S]*?<\/a>\s*<\/div>/;

export function LegalPage({ html }: { html: string }) {
  const body = html.replace(OWN_MASTHEAD, "");
  return (
    <SiteShell>
      <div className="s-wrap legal">
        <article className="legal-doc" dangerouslySetInnerHTML={{ __html: body }} />
      </div>
    </SiteShell>
  );
}
