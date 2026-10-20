"use client";

import { motion as tokens } from "@repo/tokens";
import {
  motion,
  type Transition,
  useReducedMotion,
  type Variants,
} from "motion/react";
import type { CSSProperties, ReactNode } from "react";

/*
 * Scroll-in entrances. Each element animates once, the first time it enters
 * the viewport. With reduced motion everything is shown straight away, with
 * no movement and no fade.
 *
 * Server-rendered HTML starts hidden; UIHead's <noscript> style shows any
 * `[data-reveal]` element when JavaScript is off.
 */

interface Custom {
  delay: number;
  reduce: boolean;
}

const instant: Transition = { duration: 0 };

// Items that enter view together start a beat apart; capped so the last of a
// long row doesn't lag.
const MAX_STAGGERED = 4;

const variants = {
  rise: {
    hidden: { opacity: 0, y: tokens.reveal.distance },
    shown: ({ delay, reduce }: Custom) => ({
      opacity: 1,
      y: 0,
      transition: reduce
        ? instant
        : {
            type: "spring",
            ...tokens.spring.gentle,
            delay,
            // Nested <RevealPop>s land once the parent has mostly risen.
            delayChildren: delay + 0.18,
          },
    }),
  },
  pop: {
    hidden: { opacity: 0, scale: 0.6, rotate: -8 },
    shown: ({ delay, reduce }: Custom) => ({
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: reduce
        ? instant
        : { type: "spring", ...tokens.spring.bouncy, delay },
    }),
  },
} satisfies Record<string, Variants>;

interface RevealProps {
  children: ReactNode;
  /** `pop` springs in from small; `rise` (default) eases up from below. */
  variant?: keyof typeof variants;
  /** Position in a row or list, to stagger items that appear together. */
  index?: number;
  as?: "div" | "li";
  /** Stretch to the parent's height, e.g. for equal-height grid cards. */
  fill?: boolean;
  className?: string;
}

/** Animates its content in when it scrolls into view. */
export function Reveal({
  children,
  variant = "rise",
  index = 0,
  as = "div",
  fill,
  className,
}: RevealProps) {
  const reduce = useReducedMotion() ?? false;
  const Component = as === "li" ? motion.li : motion.div;
  const custom: Custom = {
    delay: (Math.min(index, MAX_STAGGERED) * tokens.reveal.stagger) / 1000,
    reduce,
  };
  const style: CSSProperties | undefined = fill
    ? { height: "100%" }
    : undefined;

  return (
    <Component
      data-reveal=""
      className={className}
      style={style}
      variants={variants[variant]}
      custom={custom}
      initial="hidden"
      // With reduced motion, show immediately rather than waiting for scroll.
      animate={reduce ? "shown" : undefined}
      whileInView={reduce ? undefined : "shown"}
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </Component>
  );
}

/**
 * Pops in just after its enclosing `Reveal`, e.g. an icon or step number.
 * Must sit inside a `Reveal`, which decides when it plays.
 */
export function RevealPop({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.span
      data-reveal=""
      className={className}
      variants={variants.pop}
      custom={{ delay: 0, reduce } satisfies Custom}
      aria-hidden="true"
    >
      {children}
    </motion.span>
  );
}
