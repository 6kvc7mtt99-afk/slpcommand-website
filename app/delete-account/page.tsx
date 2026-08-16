import { LegalPage } from "@/components/marketing/LegalPage";
import { pageMetadata } from "@/lib/legalMeta";
import { delete_account } from "@/content/legal";

export const metadata = pageMetadata("Account Deletion Policy", "/delete-account");
export default function Page() {
  return <LegalPage html={delete_account} />;
}
