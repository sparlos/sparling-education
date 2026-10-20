import { Button } from "@repo/ui/button";
import { ComparisonTable } from "@repo/ui/marketing/comparison-table";
import { Faq } from "@repo/ui/marketing/faq";
import { FeatureGrid } from "@repo/ui/marketing/feature-grid";
import { Hero } from "@repo/ui/marketing/hero";
import { PricingTiers } from "@repo/ui/marketing/pricing-tiers";
import { Section } from "@repo/ui/marketing/section";
import { Steps } from "@repo/ui/marketing/steps";
import type { Metadata } from "next";
import { PilotCta } from "../../components/pilot-cta";
import { educators } from "../../content/educators";
import {
  classroomSteps,
  comparison,
  comparisonFull,
} from "../../content/shared";
import { joinPilot } from "../actions";

export const metadata: Metadata = educators.meta;

export default function EducatorsPage() {
  const { hero, features, howItWorks, pricing, boards, faq } = educators;
  return (
    <>
      <Hero {...hero} tone="educator" />

      <Section heading={{ id: "features", ...features }} tone="educator">
        <FeatureGrid features={features.items} tone="educator" />
      </Section>

      <Section
        surface="sunken"
        heading={{ id: "how-title", ...howItWorks }}
        tone="educator"
      >
        <Steps steps={classroomSteps} tone="educator" />
      </Section>

      <Section
        heading={{ id: "compare", ...educators.comparison }}
        tone="educator"
      >
        <ComparisonTable rows={comparisonFull} {...comparison.labels} />
      </Section>

      <Section
        id="pricing"
        surface="tone"
        tone="educator"
        heading={{ id: "pricing-title", ...pricing }}
      >
        <PricingTiers tiers={pricing.tiers} footnote={pricing.footnote} />
      </Section>

      <Section heading={{ id: "boards", ...boards }} tone="educator">
        <FeatureGrid features={boards.items} tone="educator" />
        <div style={{ marginTop: "3rem", textAlign: "center" }}>
          <Button href={boards.cta.href} variant="secondary" size="lg">
            {boards.cta.label}
          </Button>
        </div>
      </Section>

      <Section
        surface="sunken"
        prose
        heading={{ id: "faq", title: faq.title }}
        tone="educator"
      >
        <Faq items={faq.items} />
      </Section>

      <Section>
        <PilotCta id="pilot" action={joinPilot} />
      </Section>
    </>
  );
}
