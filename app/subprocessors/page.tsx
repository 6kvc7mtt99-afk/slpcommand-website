import { LegalPage } from "@/components/marketing/LegalPage";
import { pageMetadata } from "@/lib/legalMeta";
import { subprocessors } from "@/content/legal";

export const metadata = pageMetadata("Subprocessors and Third Parties", "/subprocessors");
export default function Page() {
  return <LegalPage html={subprocessors} />;
}
