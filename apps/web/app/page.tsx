import { ComparisonTable } from "@repo/ui/marketing/comparison-table";
import { PillarRow } from "@repo/ui/marketing/feature-grid";
import { Hero } from "@repo/ui/marketing/hero";
import { PromiseBand } from "@repo/ui/marketing/promise-band";
import { RoleChooser } from "@repo/ui/marketing/role-chooser";
import { Section } from "@repo/ui/marketing/section";
import { Steps } from "@repo/ui/marketing/steps";
import { PilotCta } from "../components/pilot-cta";
import { home } from "../content/home";
import {
  classroomSteps,
  comparison,
  comparisonShort,
  promiseItems,
} from "../content/shared";
import { joinPilot } from "./actions";

export default function HomePage() {
  return (
    <>
      <Hero {...home.hero} />
      <RoleChooser {...home.roles} />

      <Section heading={{ id: "pillars", ...home.pillars }}>
        <PillarRow pillars={home.pillars.pillars} />
      </Section>

      <Section
        id="how-it-works"
        surface="sunken"
        heading={{ id: "how-title", ...home.howItWorks }}
      >
        <Steps steps={classroomSteps} tone="educator" />
      </Section>

      <Section heading={{ id: "compare", ...home.comparison }}>
        <ComparisonTable rows={comparisonShort} {...comparison.labels} />
      </Section>

      <Section spacing="compact">
        <PromiseBand {...home.promise} items={promiseItems} />
      </Section>

      <Section>
        <PilotCta id="pilot" action={joinPilot} />
      </Section>
    </>
  );
}
