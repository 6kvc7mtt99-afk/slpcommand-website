import { LegalPage } from "@/components/marketing/LegalPage";
import { pageMetadata } from "@/lib/legalMeta";
import { security } from "@/content/legal";

export const metadata = pageMetadata("Security Policy", "/security");
export default function Page() {
  return <LegalPage html={security} />;
}
