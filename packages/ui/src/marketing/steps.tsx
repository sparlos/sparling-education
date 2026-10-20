import type { CSSProperties, ReactNode } from "react";
import type { Tone } from "../tone";
import { Reveal, RevealPop } from "./reveal";
import classes from "./steps.module.css";

export interface Step {
  title: string;
  body: ReactNode;
}

interface StepsProps {
  steps: Step[];
  tone?: Tone;
}

/** A numbered "how it works" sequence. */
export function Steps({ steps, tone = "brand" }: StepsProps) {
  return (
    <ol
      className={classes.list}
      data-tone={tone}
      style={{ "--steps-count": steps.length } as CSSProperties}
    >
      {steps.map((step, index) => (
        <Reveal key={step.title} as="li" index={index} className={classes.step}>
          <RevealPop className={classes.number}>{index + 1}</RevealPop>
          <h3 className={classes.title}>{step.title}</h3>
          <p className={classes.body}>{step.body}</p>
        </Reveal>
      ))}
    </ol>
  );
}
