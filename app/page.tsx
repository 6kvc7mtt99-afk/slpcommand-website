import { SiteHeader, SiteFooter } from "@/components/marketing/SiteChrome";
import { landingHtml } from "@/content/landing";

export default function HomePage() {
  const inner = landingHtml
    .replace(/<header class="site-header">[\s\S]*?<\/header>/, "")
    .replace(/<footer class="site-footer">[\s\S]*?<\/footer>/, "");
  return (
    <>
      <SiteHeader />
      <div dangerouslySetInnerHTML={{ __html: inner }} />
      <SiteFooter />
    </>
  );
}
