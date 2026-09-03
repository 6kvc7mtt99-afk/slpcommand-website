import { Reveal } from "@/components/marketing/Reveal";
import { SiteHeader, type HeaderLink } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

/**
 * Every public page: skip link, header, one <main>, footer, and the reveal
 * observer. The `.site` root scopes the public design system (app/site.css)
 * so the product's global stylesheets cannot reach into these pages.
 */
export function SiteShell({
  children,
  links,
  mainClassName,
}: {
  children: React.ReactNode;
  links?: HeaderLink[];
  mainClassName?: string;
}) {
  return (
    <div className="site">
      <a className="s-skip" href="#content">
        Skip to content
      </a>
      <SiteHeader links={links} />
      <Reveal />
      <main id="content" className={mainClassName}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
