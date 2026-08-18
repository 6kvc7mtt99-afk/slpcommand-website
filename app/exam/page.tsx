import { AuthorityPage } from "@/components/marketing/AuthorityPage";
import { authorityMetadata } from "@/lib/authority";

export const metadata = authorityMetadata("exam");
export default function Page() {
  return <AuthorityPage id="exam" />;
}
