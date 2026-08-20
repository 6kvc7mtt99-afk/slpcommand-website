import { AuthorityPage } from "@/components/marketing/AuthorityPage";
import { authorityMetadata } from "@/lib/authority";

export const metadata = authorityMetadata("guides-speaking");
export default function Page() {
  return <AuthorityPage id="guides-speaking" />;
}
