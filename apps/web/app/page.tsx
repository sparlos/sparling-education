import { ComparisonTable } from "@repo/ui/marketing/comparison-table";
import { CtaBand } from "@repo/ui/marketing/cta-band";
import { PillarRow } from "@repo/ui/marketing/feature-grid";
import { Hero } from "@repo/ui/marketing/hero";
import { PilotSignupForm } from "@repo/ui/marketing/pilot-signup-form";
import { PromiseBand } from "@repo/ui/marketing/promise-band";
import { RoleChooser } from "@repo/ui/marketing/role-chooser";
import { Section, SectionHeading } from "@repo/ui/marketing/section";
import { Steps } from "@repo/ui/marketing/steps";
import { home } from "../content/home";
import {
  classroomSteps,
  comparison,
  comparisonShort,
  pilotCta,
  pilotForm,
  promiseItems,
} from "../content/shared";
import { joinPilot } from "./actions";

export default function HomePage() {
  return (
    <>
      <Hero {...home.hero} />
      <RoleChooser {...home.roles} />

      <Section aria-labelledby="pillars">
        <SectionHeading id="pillars" {...home.pillars} />
        <PillarRow pillars={home.pillars.pillars} />
      </Section>

      <Section id="how-it-works" surface="sunken" aria-labelledby="how-title">
        <SectionHeading id="how-title" {...home.howItWorks} />
        <Steps steps={classroomSteps} tone="educator" />
      </Section>

      <Section aria-labelledby="compare">
        <SectionHeading id="compare" {...home.comparison} />
        <ComparisonTable
          rows={comparisonShort}
          rowsLabel={comparison.rowsLabel}
          typicalLabel={comparison.typicalLabel}
        />
      </Section>

      <Section spacing="compact">
        <PromiseBand {...home.promise} items={promiseItems} />
      </Section>

      <Section>
        <CtaBand id="pilot" tone="educator" {...pilotCta}>
          <PilotSignupForm action={joinPilot} {...pilotForm} />
        </CtaBand>
      </Section>
    </>
  );
}
