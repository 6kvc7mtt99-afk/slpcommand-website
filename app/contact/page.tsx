import { LegalPage } from "@/components/marketing/LegalPage";
import { pageMetadata } from "@/lib/legalMeta";
import { contact } from "@/content/legal";

export const metadata = pageMetadata("Contact", "/contact");
export default function Page() {
  return <LegalPage html={contact} />;
}
