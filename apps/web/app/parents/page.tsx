import { ComparisonTable } from "@repo/ui/marketing/comparison-table";
import { CtaBand } from "@repo/ui/marketing/cta-band";
import { EmailCapture } from "@repo/ui/marketing/email-capture";
import { Faq } from "@repo/ui/marketing/faq";
import { FeatureGrid } from "@repo/ui/marketing/feature-grid";
import { Hero } from "@repo/ui/marketing/hero";
import { PromiseBand } from "@repo/ui/marketing/promise-band";
import { Section, SectionHeading } from "@repo/ui/marketing/section";
import type { Metadata } from "next";
import { parents } from "../../content/parents";
import { comparison, comparisonFull, promiseItems } from "../../content/shared";
import { subscribeUpdates } from "../actions";

export const metadata: Metadata = parents.meta;

export default function ParentsPage() {
  const { hero, features, promise, home, faq, updates } = parents;
  return (
    <>
      <Hero {...hero} tone="parent" />

      <Section id="rewards" aria-labelledby="features" tone="parent">
        <SectionHeading id="features" {...features} />
        <FeatureGrid features={features.items} tone="parent" />
      </Section>

      <Section spacing="compact">
        <PromiseBand {...promise} items={promiseItems} />
      </Section>

      <Section aria-labelledby="compare" tone="parent">
        <SectionHeading id="compare" {...parents.comparison} />
        <ComparisonTable
          rows={comparisonFull}
          rowsLabel={comparison.rowsLabel}
          typicalLabel={comparison.typicalLabel}
        />
      </Section>

      <Section surface="tone" tone="parent" aria-labelledby="at-home">
        <SectionHeading
          id="at-home"
          eyebrow={home.eyebrow}
          title={home.title}
        />
        <FeatureGrid features={home.items} tone="parent" />
      </Section>

      <Section prose aria-labelledby="faq" tone="parent">
        <SectionHeading id="faq" title={faq.title} />
        <Faq items={faq.items} />
      </Section>

      <Section>
        <CtaBand
          id="updates"
          tone="parent"
          layout="stacked"
          title={updates.title}
          lead={updates.lead}
        >
          <EmailCapture
            action={subscribeUpdates}
            tone="parent"
            hidden={{ audience: "parent" }}
            {...updates.form}
          />
        </CtaBand>
      </Section>
    </>
  );
}
