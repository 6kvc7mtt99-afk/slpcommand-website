import { AuthorityPage } from "@/components/marketing/AuthorityPage";
import { authorityMetadata } from "@/lib/authority";

export const metadata = authorityMetadata("guides");
export default function Page() {
  return <AuthorityPage id="guides" />;
}
