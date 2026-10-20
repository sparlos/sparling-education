import { CtaBand } from "@repo/ui/marketing/cta-band";
import type { FormAction } from "@repo/ui/marketing/form-action";
import { PilotSignupForm } from "@repo/ui/marketing/pilot-signup-form";
import { pilotCta, pilotForm } from "../content/shared";

/** The teacher pilot call to action: copy, signup form and submit handler. */
export function PilotCta({ action, id }: { action: FormAction; id?: string }) {
  return (
    <CtaBand id={id} tone="educator" {...pilotCta}>
      <PilotSignupForm action={action} {...pilotForm} />
    </CtaBand>
  );
}
