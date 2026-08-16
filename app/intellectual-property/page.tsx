import { LegalPage } from "@/components/marketing/LegalPage";
import { pageMetadata } from "@/lib/legalMeta";
import { intellectual_property } from "@/content/legal";

export const metadata = pageMetadata("Intellectual Property Policy", "/intellectual-property");
export default function Page() {
  return <LegalPage html={intellectual_property} />;
}
