import { AuthorityPage } from "@/components/marketing/AuthorityPage";
import { authorityMetadata } from "@/lib/authority";

export const metadata = authorityMetadata("glossary");
export default function Page() {
  return <AuthorityPage id="glossary" />;
}
