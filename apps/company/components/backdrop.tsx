"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./backdrop.module.css";

// Faint engravings behind each section, drawn in the page's hairline style:
// squared paper behind the hero, number lines across the product's band,
// ruled paper under the principles, compass circles around the founder's
// note, and cross-hatching behind the contact. Each one draws itself once:
// the hero's on load, the others when they scroll into view. Without script
// or with reduced motion, they're simply drawn (see the CSS module).

type Line = {
  d: string;
  /** Drawn in the accent colour (the brass, or the sparkle on the band). */
  accent?: boolean;
  delay: number;
  duration: number;
};

type Pattern = { width: number; height: number; lines: Line[] };

const range = (count: number) => Array.from({ length: count }, (_, i) => i);
const fromMiddle = (i: number, count: number) => Math.abs(i - (count - 1) / 2);

/** Quarter squares, every fourth line in brass, drawn from the middle out. */
function squaredPaper(): Pattern {
  const size = 960;
  const cell = 24;
  const count = size / cell + 1;
  const lines = range(count).flatMap((i) => {
    const at = i * cell;
    const line = {
      accent: i % 4 === 0,
      delay: fromMiddle(i, count) * 20,
      duration: 1100,
    };
    return [
      { ...line, d: `M ${at} 0 V ${size}` },
      { ...line, d: `M ${size / 2} ${at} H 0` },
      { ...line, d: `M ${size / 2} ${at} H ${size}` },
    ];
  });
  return { width: size, height: size, lines };
}

/** Number lines ruled in quarters, like Fraction Hop's, drawn left to right. */
function numberLines(): Pattern {
  const width = 1440;
  const height = 720;
  const gap = 120;
  const unit = 120;
  const lines = range(height / gap).flatMap((row) => {
    const y = gap / 2 + row * gap;
    const delay = row * 140;
    const ticks = (step: number, reach: number) =>
      range(width / step + 1)
        .map((i) => `M ${i * step} ${y - reach} V ${y + reach}`)
        .join(" ");
    return [
      { d: `M 0 ${y} H ${width}`, delay, duration: 1600 },
      { d: ticks(unit / 4, 4), delay, duration: 1600 },
      { d: ticks(unit, 9), accent: true, delay, duration: 1600 },
    ];
  });
  return { width, height, lines };
}

/** Ruled paper with a brass margin, each line drawn left to right. */
function ruledPaper(): Pattern {
  const width = 1200;
  const height = 600;
  const gap = 30;
  const lines: Line[] = range(height / gap).map((row) => ({
    d: `M 0 ${gap + row * gap} H ${width}`,
    delay: row * 45,
    duration: 1200,
  }));
  lines.push({
    d: `M 96 0 V ${height}`,
    accent: true,
    delay: 200,
    duration: 1400,
  });
  return { width, height, lines };
}

/** Concentric circles from one point, as a compass would draw them. */
function compassCircles(): Pattern {
  const width = 720;
  const height = 960;
  const cx = width / 2;
  const cy = 80;
  const lines = range(9).map((i) => {
    const r = 48 + i * 64;
    return {
      d: `M ${cx} ${cy - r} a ${r} ${r} 0 1 1 0 ${2 * r} a ${r} ${r} 0 1 1 0 ${-2 * r}`,
      accent: i % 3 === 0,
      delay: i * 110,
      duration: 1500,
    };
  });
  return { width, height, lines };
}

/** An engraver's diagonal hatching, drawn from the middle out. */
function crossHatching(): Pattern {
  const width = 960;
  const height = 480;
  const gap = 18;
  const count = Math.ceil((width + height) / gap);
  const lines = range(count).map((i) => {
    const x = i * gap - height;
    return {
      d: `M ${x} ${height} L ${x + height} 0`,
      delay: fromMiddle(i, count) * 18,
      duration: 900,
    };
  });
  return { width, height, lines };
}

const patterns = {
  squaredPaper,
  numberLines,
  ruledPaper,
  compassCircles,
  crossHatching,
};

type Motion = "still" | "waiting" | "playing";

export function Backdrop({
  pattern,
  start,
  className,
}: {
  pattern: keyof typeof patterns;
  /** "load" draws at once; "view" waits until it scrolls into view. */
  start: "load" | "view";
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [motion, setMotion] = useState<Motion>("still");
  const { width, height, lines } = patterns[pattern]();

  useEffect(() => {
    const svg = ref.current;
    if (
      start === "load" ||
      !svg ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    setMotion("waiting");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setMotion("playing");
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(svg);
    return () => observer.disconnect();
  }, [start]);

  return (
    <svg
      ref={ref}
      className={[styles.backdrop, className].filter(Boolean).join(" ")}
      data-start={start}
      data-motion={motion}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
    >
      {lines.map((line) => (
        <path
          key={line.d}
          className={styles.line}
          style={
            {
              animationDelay: `${line.delay}ms`,
              animationDuration: `${line.duration}ms`,
            } as CSSProperties
          }
          d={line.d}
          pathLength={1}
          data-accent={line.accent || undefined}
        />
      ))}
    </svg>
  );
}
