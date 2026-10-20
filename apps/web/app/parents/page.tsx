import { ComparisonTable } from "@repo/ui/marketing/comparison-table";
import { CtaBand } from "@repo/ui/marketing/cta-band";
import { EmailCapture } from "@repo/ui/marketing/email-capture";
import { Faq } from "@repo/ui/marketing/faq";
import { FeatureGrid } from "@repo/ui/marketing/feature-grid";
import { Hero } from "@repo/ui/marketing/hero";
import { PromiseBand } from "@repo/ui/marketing/promise-band";
import { Section } from "@repo/ui/marketing/section";
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

      <Section
        id="rewards"
        heading={{ id: "features", ...features }}
        tone="parent"
      >
        <FeatureGrid features={features.items} tone="parent" />
      </Section>

      <Section spacing="compact">
        <PromiseBand {...promise} items={promiseItems} />
      </Section>

      <Section heading={{ id: "compare", ...parents.comparison }} tone="parent">
        <ComparisonTable rows={comparisonFull} {...comparison.labels} />
      </Section>

      <Section
        surface="tone"
        tone="parent"
        heading={{ id: "at-home", eyebrow: home.eyebrow, title: home.title }}
      >
        <FeatureGrid features={home.items} tone="parent" />
      </Section>

      <Section prose heading={{ id: "faq", title: faq.title }} tone="parent">
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
