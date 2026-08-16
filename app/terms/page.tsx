import { LegalPage } from "@/components/marketing/LegalPage";
import { pageMetadata } from "@/lib/legalMeta";
import { terms } from "@/content/legal";

export const metadata = pageMetadata("Terms of Service", "/terms");
export default function Page() {
  return <LegalPage html={terms} />;
}
