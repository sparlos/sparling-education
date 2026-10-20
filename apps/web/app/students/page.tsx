import { Button } from "@repo/ui/button";
import { CtaBand } from "@repo/ui/marketing/cta-band";
import { FeatureGrid } from "@repo/ui/marketing/feature-grid";
import { Hero } from "@repo/ui/marketing/hero";
import { PromiseBand } from "@repo/ui/marketing/promise-band";
import { Section, SectionHeading } from "@repo/ui/marketing/section";
import { Steps } from "@repo/ui/marketing/steps";
import type { Metadata } from "next";
import { students } from "../../content/students";

export const metadata: Metadata = students.meta;

// This page must never collect information from students: no forms.
export default function StudentsPage() {
  const { hero, features, steps, promise, cta } = students;
  return (
    <>
      <Hero {...hero} tone="student" />

      <Section id="things-to-do" aria-labelledby="features" tone="student">
        <SectionHeading id="features" {...features} />
        <FeatureGrid features={features.items} tone="student" />
      </Section>

      <Section surface="tone" tone="student" aria-labelledby="start">
        <SectionHeading
          id="start"
          eyebrow={steps.eyebrow}
          title={steps.title}
        />
        <Steps steps={steps.steps} tone="student" />
      </Section>

      <Section spacing="compact">
        <PromiseBand {...promise} />
      </Section>

      <Section>
        <CtaBand
          tone="student"
          layout="stacked"
          title={cta.title}
          lead={cta.lead}
        >
          <Button href={cta.action.href} tone="student" size="lg">
            {cta.action.label}
          </Button>
        </CtaBand>
      </Section>
    </>
  );
}
