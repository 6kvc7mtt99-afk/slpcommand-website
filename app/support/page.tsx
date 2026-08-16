import { LegalPage } from "@/components/marketing/LegalPage";
import { pageMetadata } from "@/lib/legalMeta";
import { support } from "@/content/legal";

export const metadata = pageMetadata("Support", "/support");
export default function Page() {
  return <LegalPage html={support} />;
}
