import { LegalPage } from "@/components/marketing/LegalPage";
import { pageMetadata } from "@/lib/legalMeta";
import { ai_usage } from "@/content/legal";

export const metadata = pageMetadata("Responsible AI Policy", "/ai-usage");
export default function Page() {
  return <LegalPage html={ai_usage} />;
}
