import { LegalChrome } from "./SiteChrome";

export function LegalPage({ html }: { html: string }) {
  return (
    <LegalChrome>
      <div className="wrap" dangerouslySetInnerHTML={{ __html: html }} />
    </LegalChrome>
  );
}
