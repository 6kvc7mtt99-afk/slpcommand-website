import { LegalPage } from "@/components/marketing/LegalPage";
import { pageMetadata } from "@/lib/legalMeta";
import { trust_center } from "@/content/legal";

export const metadata = pageMetadata("Trust Center", "/trust-center");
export default function Page() {
  return <LegalPage html={trust_center} />;
}
