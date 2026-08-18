import { SiteHeader, SiteFooter } from "@/components/marketing/SiteChrome";
import { JsonLd } from "@/components/marketing/JsonLd";
import { landingHtml } from "@/content/landing";
import { organizationJsonLd, softwareJsonLd, websiteJsonLd } from "@/lib/authority";

export default function HomePage() {
  const inner = landingHtml
    .replace(/<header class="site-header">[\s\S]*?<\/header>/, "")
    .replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, "");
  return (
    <>
      <SiteHeader />
      <div dangerouslySetInnerHTML={{ __html: inner }} />
      <SiteFooter />
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />
      <JsonLd data={softwareJsonLd} />
    </>
  );
}
