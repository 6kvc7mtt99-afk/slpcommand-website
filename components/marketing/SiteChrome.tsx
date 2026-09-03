/**
 * Compatibility surface for the public chrome.
 *
 * The header and footer now live in components/site/. The login and signup
 * ceremonies import `SiteHeader` from here with their own reduced link set,
 * and the legal template imports `LegalChrome`; keeping these names means the
 * authentication screens did not have to change to receive the new header.
 */
import { SiteHeader, LogoMark, type HeaderLink } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export { SiteHeader, SiteFooter, LogoMark };
export type { HeaderLink };

export function LegalChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
