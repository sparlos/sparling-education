import type { CSSProperties, ReactNode } from "react";
import type { ButtonTone } from "../button";
import classes from "./steps.module.css";

export interface Step {
  title: string;
  body: ReactNode;
}

interface StepsProps {
  steps: Step[];
  tone?: ButtonTone;
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
        <li key={step.title} className={classes.step}>
          <span className={classes.number} aria-hidden="true">
            {index + 1}
          </span>
          <h3 className={classes.title}>{step.title}</h3>
          <p className={classes.body}>{step.body}</p>
        </li>
      ))}
    </ol>
  );
}
