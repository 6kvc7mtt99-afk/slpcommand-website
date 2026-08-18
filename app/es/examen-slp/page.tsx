import { AuthorityPage } from "@/components/marketing/AuthorityPage";
import { authorityMetadata } from "@/lib/authority";

export const metadata = authorityMetadata("es-examen-slp");
export default function Page() {
  return <AuthorityPage id="es-examen-slp" />;
}
