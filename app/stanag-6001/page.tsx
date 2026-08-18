import { AuthorityPage } from "@/components/marketing/AuthorityPage";
import { authorityMetadata } from "@/lib/authority";

export const metadata = authorityMetadata("stanag-6001");
export default function Page() {
  return <AuthorityPage id="stanag-6001" />;
}
