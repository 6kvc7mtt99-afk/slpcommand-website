import { LegalPage } from "@/components/marketing/LegalPage";
import { pageMetadata } from "@/lib/legalMeta";
import { legal_notice } from "@/content/legal";

export const metadata = pageMetadata("Legal Notice", "/legal-notice");
export default function Page() {
  return <LegalPage html={legal_notice} />;
}
