import { AuthorityPage } from "@/components/marketing/AuthorityPage";
import { authorityMetadata } from "@/lib/authority";

export const metadata = authorityMetadata("es-slp-3");
export default function Page() {
  return <AuthorityPage id="es-slp-3" />;
}
