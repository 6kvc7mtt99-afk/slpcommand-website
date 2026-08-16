import { LegalPage } from "@/components/marketing/LegalPage";
import { pageMetadata } from "@/lib/legalMeta";
import { disclaimer } from "@/content/legal";

export const metadata = pageMetadata("Institutional Disclaimer", "/disclaimer");
export default function Page() {
  return <LegalPage html={disclaimer} />;
}
