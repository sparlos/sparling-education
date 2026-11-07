"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import classes from "./ambient.module.css";
import { Glint, Sparkle, Wing } from "./decor";

/*
 * A few sparkles and glints scattered through a section's white space: beside
 * its heading and down its side margins. They rise in, one after another, the
 * first time the section scrolls into view, then drift and twinkle. On tinted
 * bands a big faint wing beats slowly off one corner. Without script or with
 * reduced motion they're simply there, still.
 */

type Surface = "page" | "raised" | "sunken" | "tone" | "inverse";

type Placement = Partial<Record<"top" | "left" | "right" | "bottom", string>>;

interface Bit {
  kind: "sparkle" | "glint";
  size: number;
  at: Placement;
  /** `tone` follows the section's audience; otherwise the logo's gold. */
  color: "tone" | "sparkle";
  opacity: number;
  delay: number;
  /** Beside the heading, so hidden once the heading spans the width. */
  byHeading?: boolean;
}

// Beside a centred heading: just past the edge of its 46rem column.
const headingTop = (offset: string) => `calc(var(--ambient-top) + ${offset})`;
const besideHeading = "calc(50% - 28rem)";

const layouts: Bit[][] = [
  [
    {
      kind: "sparkle",
      size: 22,
      at: { top: headingTop("0.5rem"), left: besideHeading },
      color: "sparkle",
      opacity: 0.9,
      delay: 0,
      byHeading: true,
    },
    {
      kind: "glint",
      size: 12,
      at: { top: headingTop("3.5rem"), right: besideHeading },
      color: "tone",
      opacity: 0.55,
      delay: 7,
      byHeading: true,
    },
    {
      kind: "glint",
      size: 14,
      at: { top: "58%", left: "2.5%" },
      color: "tone",
      opacity: 0.4,
      delay: 3,
    },
    {
      kind: "sparkle",
      size: 14,
      at: { bottom: "12%", right: "3%" },
      color: "sparkle",
      opacity: 0.7,
      delay: 11,
    },
  ],
  [
    {
      kind: "glint",
      size: 14,
      at: { top: headingTop("2.5rem"), left: besideHeading },
      color: "tone",
      opacity: 0.5,
      delay: 5,
      byHeading: true,
    },
    {
      kind: "sparkle",
      size: 18,
      at: { top: headingTop("0rem"), right: besideHeading },
      color: "sparkle",
      opacity: 0.85,
      delay: 1,
      byHeading: true,
    },
    {
      kind: "sparkle",
      size: 12,
      at: { bottom: "16%", left: "3%" },
      color: "tone",
      opacity: 0.45,
      delay: 9,
    },
    {
      kind: "glint",
      size: 12,
      at: { top: "44%", right: "2.5%" },
      color: "sparkle",
      opacity: 0.6,
      delay: 14,
    },
  ],
  [
    {
      kind: "sparkle",
      size: 16,
      at: { top: headingTop("4rem"), left: besideHeading },
      color: "tone",
      opacity: 0.5,
      delay: 8,
      byHeading: true,
    },
    {
      kind: "glint",
      size: 12,
      at: { top: headingTop("1rem"), right: besideHeading },
      color: "sparkle",
      opacity: 0.75,
      delay: 2,
      byHeading: true,
    },
    {
      kind: "glint",
      size: 16,
      at: { top: "38%", left: "2%" },
      color: "sparkle",
      opacity: 0.55,
      delay: 12,
    },
    {
      kind: "sparkle",
      size: 20,
      at: { bottom: "10%", right: "3.5%" },
      color: "tone",
      opacity: 0.4,
      delay: 4,
    },
  ],
];

/** Picks the same layout for a section every time, and varies it down a page. */
function pick(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

type Motion = "still" | "waiting" | "shown";

export function Ambient({
  seed,
  surface,
  compact,
}: {
  /** Usually the section heading's id. */
  seed: string;
  surface: Surface;
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [motion, setMotion] = useState<Motion>("still");
  const n = pick(seed);
  const bits = layouts[n % layouts.length] ?? [];
  const tinted = surface === "sunken" || surface === "tone";
  const wingOnLeft = n % 2 === 0;

  useEffect(() => {
    const layer = ref.current;
    if (
      !layer ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    setMotion("waiting");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setMotion("shown");
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(layer);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={classes.layer}
      data-motion={motion}
      data-compact={compact || undefined}
      aria-hidden="true"
    >
      {tinted && (
        <Wing
          size={380}
          color="tone"
          opacity={0.08}
          sway
          hideOnMobile
          {...(wingOnLeft
            ? { left: "-110px", top: "-100px" }
            : { right: "-110px", bottom: "-120px", flip: true })}
        />
      )}
      {bits.map((bit, i) => {
        const Shape = bit.kind === "sparkle" ? Sparkle : Glint;
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed layout
            key={i}
            className={classes.bit}
            style={{ "--i": i } as CSSProperties}
          >
            <Shape
              size={bit.size}
              color={bit.color}
              opacity={bit.opacity}
              delay={bit.delay}
              {...bit.at}
              drift
              hideOnMobile
              hideOnTablet={bit.byHeading}
            />
          </span>
        );
      })}
    </div>
  );
}
