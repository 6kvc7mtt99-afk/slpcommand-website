import type { Metadata } from "next";
import { Faq } from "@/components/site/Faq";
import { ClosingBeat, PageHero } from "@/components/site/PageHero";
import { PricingCompare, PricingPlans } from "@/components/site/PricingPlans";
import { SiteShell } from "@/components/site/SiteShell";
import { SectionHead } from "@/components/site/primitives";
import { HOME } from "@/content/site/home";
import { PRICING_FAQ, PRO_PLAN } from "@/content/site/pricing";
import { SIGNUP_PATH } from "@/lib/conversion";
import { marketingMetadata } from "@/lib/site";

export const metadata: Metadata = marketingMetadata("pricing");

export default function PricingPage() {
  return (
    <SiteShell>
      <PageHero
        compact
        eyebrow="Pricing · STANAG 6001 / SLP Levels 2 & 3"
        title="Two plans. One trainer."
        lead={`Free measures all four skills with real allowances. ${PRO_PLAN.name} removes the caps and adds the coaching layer and the live Speaking Coach. Same criteria, at SLP 2 or SLP 3.`}
        notes={["No card for Free", `${PRO_PLAN.price} a month, cancel anytime`, "Pay by card on the web"]}
      />

      <section className="s-section s-section--flush" aria-label="Plans">
        <div className="s-wrap">
          <PricingPlans />
        </div>
      </section>

      <section className="s-section s-section--band" aria-labelledby="compare-title">
        <div className="s-wrap">
          <SectionHead
            eyebrow="Every allowance"
            title={<span id="compare-title">What each plan gives, line by line.</span>}
            lead="Allowances are read from the same table the product enforces, so this page cannot promise something the account does not get."
            split
          />
          <PricingCompare />
        </div>
      </section>

      <section className="s-section" id="faq" aria-labelledby="bfaq-title">
        <div className="s-wrap s-wrap--narrow">
          <SectionHead eyebrow="Billing" title={<span id="bfaq-title">Before you pay</span>} align="center" />
          <Faq items={PRICING_FAQ} />
        </div>
      </section>

      <ClosingBeat
        eyebrow="Start here"
        title="Start free. Upgrade when the caps matter."
        lead={HOME.closing.lead}
        primary={{ href: SIGNUP_PATH, label: "Start training free" }}
        secondary={{ href: "/product", label: "See how it works" }}
        notes={HOME.closing.notes}
      />
    </SiteShell>
  );
}
