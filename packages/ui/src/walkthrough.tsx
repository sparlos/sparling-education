import { Tour as MantineSteps } from "@mantine/core";
import { radius, shadow, space } from "@repo/tokens";
import type { ReactNode } from "react";
import { cx } from "./cx";
import press from "./press.module.css";
import type { Tone } from "./tone";
import classes from "./walkthrough.module.css";

export interface WalkthroughStep {
  /**
   * A CSS selector for the control the step points at, spotlit with the rest
   * of the page dimmed. None for a step in the middle of the screen. It may
   * mount after the step opens.
   */
  target?: string;
  title: string;
  body: ReactNode;
  /** Where the step sits against its target, flipping when there's no room. */
  position?: "top" | "bottom" | "left" | "right" | "bottom-start" | "top-start";
}

export interface WalkthroughLabels {
  skip: string;
  back: string;
  next: string;
  /** The last step's button. */
  done: string;
  /** "2 of 5", announced as the step changes. */
  progress(current: number, total: number): string;
}

interface WalkthroughProps {
  open: boolean;
  steps: WalkthroughStep[];
  step: number;
  onStepChange(step: number): void;
  /** Skipped, finished, or closed with Escape. */
  onClose(): void;
  labels: WalkthroughLabels;
  /** Colour of the forward button and the progress. */
  tone?: Tone;
}

/** About the tallest a step's card gets, to leave room for it. */
const cardRoom = 320;

/**
 * Brings a step's control into view with room for its card above or below,
 * putting it near the top when it's too tall for both, as on a phone.
 */
function scrollToStep(element: HTMLElement) {
  const { top, bottom } = element.getBoundingClientRect();
  const view = window.innerHeight;
  const margin = space.lg;
  const roomBelow = top >= margin && bottom + cardRoom <= view;
  const roomAbove = top - cardRoom >= margin && bottom <= view;
  if (roomBelow || roomAbove) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({
    top: window.scrollY + top - margin,
    behavior: reduced ? "auto" : "smooth",
  });
}

/**
 * A guide through the real controls on screen, one step at a time: each is
 * spotlit with the rest of the page dimmed, beside a card that says what
 * it's for, with Back, Next and Skip. Focus stays in the card, and the arrow
 * keys and Escape work.
 */
export function Walkthrough({
  open,
  steps,
  step,
  onStepChange,
  onClose,
  labels,
  tone = "brand",
}: WalkthroughProps) {
  return (
    <MantineSteps
      active={open}
      step={step}
      onStepChange={onStepChange}
      onClose={onClose}
      data-tone={tone}
      withCloseButton={false}
      scrollToHandler={scrollToStep}
      spotlightPadding={8}
      spotlightRadius={radius.md}
      overlayColor="var(--k-scrim)"
      tooltipShadow={shadow.xl}
      maxWidth={380}
      labels={{
        skip: labels.skip,
        back: labels.back,
        next: labels.next,
        close: labels.done,
        stepCounter: labels.progress,
      }}
      classNames={{
        tooltip: classes.card,
        title: classes.title,
        body: classes.body,
        navigation: classes.navigation,
        stepCounter: classes.counter,
        navigationButton: cx(classes.button, press.press),
      }}
    >
      {steps.map((s, i) => (
        <MantineSteps.Step
          // Steps are fixed for as long as a walkthrough is open.
          // biome-ignore lint/suspicious/noArrayIndexKey: see above
          key={i}
          target={s.target}
          title={s.title}
          position={s.position}
        >
          {s.body}
          <span className={classes.dots} aria-hidden="true">
            {steps.map((_, j) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: one per step
                key={j}
                className={classes.dot}
                data-done={j < i || undefined}
                data-current={j === i || undefined}
              />
            ))}
          </span>
        </MantineSteps.Step>
      ))}
    </MantineSteps>
  );
}
