"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./hop-line.module.css";

// Beside the product's screenshot: a number line from 0 to 3 with three
// hops, 1, 1 and 1/4, landing on 9/4, the same plan as in Fraction Hop. It
// draws itself once, when it first scrolls into view. Without script or
// with reduced motion, it's simply drawn (see the CSS module).

const unit = 160;
const origin = 40;
const baseline = 120;
const x = (value: number) => origin + value * unit;

const hops = [
  { from: 0, to: 1, height: 74 },
  { from: 1, to: 2, height: 74 },
  { from: 2, to: 2.25, height: 34 },
];

const quarters = Array.from({ length: 13 }, (_, i) => i / 4);

type Motion = "still" | "waiting" | "playing";

export function HopLine({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [motion, setMotion] = useState<Motion>("still");

  useEffect(() => {
    const svg = ref.current;
    if (
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
      { threshold: 0.6 },
    );
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      className={[
        styles.hopLine,
        motion !== "still" && styles.moving,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-motion={motion}
      viewBox="0 0 560 172"
      aria-hidden="true"
    >
      <line
        className={styles.axis}
        x1={origin - 20}
        x2={x(3) + 20}
        y1={baseline}
        y2={baseline}
        pathLength={1}
      />
      {quarters.map((value, i) => {
        const whole = Number.isInteger(value);
        return (
          <line
            key={value}
            className={styles.tick}
            style={{ animationDelay: `${300 + i * 35}ms` }}
            x1={x(value)}
            x2={x(value)}
            y1={baseline - (whole ? 9 : 5)}
            y2={baseline + (whole ? 9 : 5)}
            data-whole={whole || undefined}
          />
        );
      })}
      {[0, 1, 2, 3].map((value) => (
        <text
          key={value}
          className={styles.label}
          x={x(value)}
          y={baseline + 36}
          textAnchor="middle"
        >
          {value}
        </text>
      ))}
      {hops.map((hop, i) => {
        const x1 = x(hop.from);
        const x2 = x(hop.to);
        const mid = (x1 + x2) / 2;
        return (
          <path
            key={hop.from}
            className={styles.hop}
            style={{ animationDelay: `${900 + i * 420}ms` }}
            d={`M ${x1} ${baseline - 12} Q ${mid} ${baseline - 12 - hop.height * 2} ${x2} ${baseline - 12}`}
            pathLength={1}
          />
        );
      })}
      <g
        className={styles.landing}
        style={{ transformOrigin: `${x(2.25)}px ${baseline}px` }}
      >
        <circle cx={x(2.25)} cy={baseline} r={7} />
        <text
          className={styles.goal}
          x={x(2.25)}
          y={baseline + 36}
          textAnchor="middle"
        >
          9/4
        </text>
      </g>
    </svg>
  );
}
