import { LegalPage } from "@/components/marketing/LegalPage";
import { pageMetadata } from "@/lib/legalMeta";
import { cookies } from "@/content/legal";

export const metadata = pageMetadata("Cookie Policy", "/cookies");
export default function Page() {
  return <LegalPage html={cookies} />;
}
