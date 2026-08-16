import { LegalPage } from "@/components/marketing/LegalPage";
import { pageMetadata } from "@/lib/legalMeta";
import { privacy } from "@/content/legal";

export const metadata = pageMetadata("Privacy Policy", "/privacy");
export default function Page() {
  return <LegalPage html={privacy} />;
}
