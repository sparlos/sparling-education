import { Anchor } from "@repo/ui/anchor";
import { VisuallyHidden } from "@repo/ui/visually-hidden";
import type { DashboardExpectation } from "../platform/ports.ts";

/**
 * "Grade 4 · B1.6", linked to its official page on the curriculum site, in a
 * new tab: the ministry's wording, one tap away, without Kindling copying it.
 * Not previewed in a frame: the site won't load in one (it signs in with MSAL,
 * which stalls inside an iframe).
 */
export function OfficialCode({
  expectation,
  className,
  label = expectationLabel(expectation),
}: {
  expectation: DashboardExpectation;
  className?: string;
  /** The link's text, when the full "Grade 4 · B1.6" is too long. */
  label?: string;
}) {
  return (
    <Anchor href={expectation.link} newTab className={className}>
      {label}
      <VisuallyHidden>, official wording (opens in a new tab)</VisuallyHidden>
    </Anchor>
  );
}

/** "Grade 4 · B1.6" */
export function expectationLabel({ grade, code }: DashboardExpectation) {
  return `Grade ${grade} · ${code}`;
}
