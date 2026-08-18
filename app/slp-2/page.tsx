import { AuthorityPage } from "@/components/marketing/AuthorityPage";
import { authorityMetadata } from "@/lib/authority";

export const metadata = authorityMetadata("slp-2");
export default function Page() {
  return <AuthorityPage id="slp-2" />;
}
