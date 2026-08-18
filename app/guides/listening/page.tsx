import { AuthorityPage } from "@/components/marketing/AuthorityPage";
import { authorityMetadata } from "@/lib/authority";

export const metadata = authorityMetadata("guides-listening");
export default function Page() {
  return <AuthorityPage id="guides-listening" />;
}
