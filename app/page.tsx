import type { Metadata } from "next";
import { JsonLd } from "@/components/marketing/JsonLd";
import { SiteShell } from "@/components/site/SiteShell";
import { Hero } from "@/components/site/home/Hero";
import { Problem, Skills, System } from "@/components/site/home/Narrative";
import { IntelligenceStage } from "@/components/site/home/Intelligence";
import { AcademiesPanel, Audience, ExamSection, Trust } from "@/components/site/home/Proof";
import { Closing, FaqSection, PricingSection } from "@/components/site/home/Commercial";
import { organizationJsonLd, softwareJsonLd, websiteJsonLd } from "@/lib/authority";
import { marketingMetadata } from "@/lib/site";

export const metadata: Metadata = marketingMetadata("home");

/**
 * The homepage, as a narrative: what it is (hero) → why conventional
 * preparation stalls → the system → who it is for → the four skills → one
 * intelligence stage (what is wrong, what to do today) → exam conditions →
 * academies → trust → pricing → questions → start. Every section is a server component; the only
 * client code on the page is the header's menu toggle and the reveal observer.
 */
export default function HomePage() {
  return (
    <SiteShell>
      <Hero />
      <Problem />
      <System />
      <Audience />
      <Skills />
      <IntelligenceStage />
      <ExamSection />
      <AcademiesPanel />
      <Trust />
      <PricingSection />
      <FaqSection />
      <Closing />
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />
      <JsonLd data={softwareJsonLd} />
    </SiteShell>
  );
}
