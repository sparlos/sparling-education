"use client";

import { motion as tokens } from "@repo/tokens";
import { motion, useReducedMotion } from "motion/react";
import { useActionState } from "react";
import { Icon } from "../icon";
import classes from "./forms.module.css";

/** What a form's server action reports back. */
export interface FormResult {
  ok: boolean;
  message: string;
}

export type FormAction = (formData: FormData) => Promise<FormResult>;

/** Runs `action` on submit; `result` is null until the first submission. */
export function useFormAction(action: FormAction) {
  return useActionState<FormResult | null, FormData>(
    (_previous, formData) => action(formData),
    null,
  );
}

// Directions (degrees) for the burst of confetti dots around the check.
const confetti = [0, 60, 120, 180, 240, 300];

/**
 * Replaces a form once it has been submitted successfully: the message
 * springs in and the check bursts a little confetti. Reduced motion gets
 * the message alone, with no movement.
 */
export function FormSuccess({ message }: { message: string }) {
  const reduce = useReducedMotion();
  const spring = { type: "spring", ...tokens.spring.bouncy } as const;

  return (
    <motion.p
      className={classes.status}
      role="status"
      initial={reduce ? false : { opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={spring}
    >
      <span className={classes.check}>
        <motion.span
          className={classes.checkIcon}
          initial={reduce ? false : { scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...spring, delay: 0.1 }}
        >
          <Icon name="check" size={24} />
        </motion.span>
        {!reduce &&
          confetti.map((angle, i) => (
            <motion.span
              key={angle}
              className={classes.confetti}
              data-color={i % 3}
              aria-hidden="true"
              initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: 0,
                scale: 1,
                x: Math.cos((angle * Math.PI) / 180) * 26,
                y: Math.sin((angle * Math.PI) / 180) * 26,
              }}
              transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            />
          ))}
      </span>
      {message}
    </motion.p>
  );
}
