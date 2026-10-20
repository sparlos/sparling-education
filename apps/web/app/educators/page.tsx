import { Button } from "@repo/ui/button";
import { ComparisonTable } from "@repo/ui/marketing/comparison-table";
import { CtaBand } from "@repo/ui/marketing/cta-band";
import { Faq } from "@repo/ui/marketing/faq";
import { FeatureGrid } from "@repo/ui/marketing/feature-grid";
import { Hero } from "@repo/ui/marketing/hero";
import { PilotSignupForm } from "@repo/ui/marketing/pilot-signup-form";
import { PricingTiers } from "@repo/ui/marketing/pricing-tiers";
import { Section, SectionHeading } from "@repo/ui/marketing/section";
import { Steps } from "@repo/ui/marketing/steps";
import type { Metadata } from "next";
import { educators } from "../../content/educators";
import {
  classroomSteps,
  comparison,
  comparisonFull,
  pilotCta,
  pilotForm,
} from "../../content/shared";
import { joinPilot } from "../actions";

export const metadata: Metadata = educators.meta;

export default function EducatorsPage() {
  const { hero, features, howItWorks, pricing, boards, faq } = educators;
  return (
    <>
      <Hero {...hero} tone="educator" />

      <Section aria-labelledby="features" tone="educator">
        <SectionHeading id="features" {...features} />
        <FeatureGrid features={features.items} tone="educator" />
      </Section>

      <Section surface="sunken" aria-labelledby="how-title" tone="educator">
        <SectionHeading id="how-title" {...howItWorks} />
        <Steps steps={classroomSteps} tone="educator" />
      </Section>

      <Section aria-labelledby="compare" tone="educator">
        <SectionHeading id="compare" {...educators.comparison} />
        <ComparisonTable
          rows={comparisonFull}
          rowsLabel={comparison.rowsLabel}
          typicalLabel={comparison.typicalLabel}
        />
      </Section>

      <Section
        id="pricing"
        surface="tone"
        tone="educator"
        aria-labelledby="pricing-title"
      >
        <SectionHeading id="pricing-title" {...pricing} />
        <PricingTiers tiers={pricing.tiers} footnote={pricing.footnote} />
      </Section>

      <Section aria-labelledby="boards" tone="educator">
        <SectionHeading id="boards" {...boards} />
        <FeatureGrid features={boards.items} tone="educator" />
        <div style={{ marginTop: "3rem", textAlign: "center" }}>
          <Button href={boards.cta.href} variant="secondary" size="lg">
            {boards.cta.label}
          </Button>
        </div>
      </Section>

      <Section surface="sunken" prose aria-labelledby="faq" tone="educator">
        <SectionHeading id="faq" title={faq.title} />
        <Faq items={faq.items} />
      </Section>

      <Section>
        <CtaBand id="pilot" tone="educator" {...pilotCta}>
          <PilotSignupForm action={joinPilot} {...pilotForm} />
        </CtaBand>
      </Section>
    </>
  );
}
