import { LegalPage } from "@/components/marketing/LegalPage";
import { pageMetadata } from "@/lib/legalMeta";
import { data_retention } from "@/content/legal";

export const metadata = pageMetadata("Data Retention Policy", "/data-retention");
export default function Page() {
  return <LegalPage html={data_retention} />;
}
