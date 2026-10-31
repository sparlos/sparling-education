import type { CSSProperties, ReactNode } from "react";
import { cx } from "../cx";
import classes from "./decor.module.css";

/** Decorative colours: an audience/brand tone or the sparkle's gold. */
type DecorColor =
  | "tone"
  | "tone-soft"
  | "brand"
  | "educator"
  | "parent"
  | "sparkle";

const fills: Record<DecorColor, string> = {
  tone: "var(--tone-fill)",
  "tone-soft": "var(--tone-soft)",
  brand: "var(--k-brand-fill)",
  educator: "var(--k-educator-fill)",
  parent: "var(--k-parent-fill)",
  sparkle: "var(--k-sparkle)",
};

interface ShapeProps {
  /** Size in px. */
  size: number;
  color?: DecorColor;
  opacity?: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  rotate?: number;
  float?: boolean;
  hideOnMobile?: boolean;
}

function shapeStyle(p: ShapeProps): CSSProperties {
  return {
    width: p.size,
    height: p.size,
    top: p.top,
    left: p.left,
    right: p.right,
    bottom: p.bottom,
    opacity: p.opacity,
    rotate: p.rotate ? `${p.rotate}deg` : undefined,
  };
}

function shapeClass(p: ShapeProps) {
  return cx(
    classes.shape,
    p.float && classes.float,
    p.hideOnMobile && classes.hideMobile,
  );
}

/** Absolutely positioned, non-interactive layer for decorative shapes. */
export function DecorLayer({ children }: { children: ReactNode }) {
  return (
    <div className={classes.layer} aria-hidden="true">
      {children}
    </div>
  );
}

/**
 * Light and shade laid over a crystal's base colour, facet by facet, so one
 * fill reads as a faceted gem in any tone.
 */
const facetShades = [
  "rgba(255, 255, 255, 0.45)",
  "rgba(255, 255, 255, 0.2)",
  "rgba(27, 18, 89, 0.12)",
  "rgba(27, 18, 89, 0.22)",
  "rgba(255, 255, 255, 0.3)",
];

/** A large faceted crystal shard, best bleeding off a band's edge. */
export function Shard(props: ShapeProps) {
  // An irregular five-sided crystal, cut into facets that meet off-centre.
  const rim = [
    [18, 118],
    [92, 8],
    [184, 52],
    [158, 192],
    [36, 178],
  ] as const;
  const core = [104, 96] as const;
  return (
    <svg
      aria-hidden="true"
      className={shapeClass(props)}
      style={shapeStyle(props)}
      viewBox="0 0 200 200"
    >
      <g fill={fills[props.color ?? "tone"]}>
        {rim.map((point, i) => {
          const next = rim[(i + 1) % rim.length] ?? rim[0];
          return (
            <path
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed geometry
              key={i}
              d={`M${core.join(",")}L${point.join(",")}L${next.join(",")}Z`}
            />
          );
        })}
      </g>
      {rim.map((point, i) => {
        const next = rim[(i + 1) % rim.length] ?? rim[0];
        return (
          <path
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed geometry
            key={i}
            d={`M${core.join(",")}L${point.join(",")}L${next.join(",")}Z`}
            fill={facetShades[i]}
          />
        );
      })}
    </svg>
  );
}

/** Four-point sparkle, in the logo's gold by default. */
export function Sparkle(props: ShapeProps) {
  return (
    <svg
      aria-hidden="true"
      className={shapeClass(props)}
      style={shapeStyle(props)}
      viewBox="0 0 24 24"
    >
      <path
        fill={fills[props.color ?? "sparkle"]}
        d="M12 0c.9 6.3 5.1 10.6 12 12-6.9 1.4-11.1 5.7-12 12-.9-6.3-5.1-10.6-12-12C6.9 10.6 11.1 6.3 12 0z"
      />
    </svg>
  );
}

/** A small glint: a gem facet, lit on one side. */
export function Glint(props: ShapeProps) {
  return (
    <svg
      aria-hidden="true"
      className={shapeClass(props)}
      style={shapeStyle(props)}
      viewBox="0 0 24 24"
    >
      <path d="M12 2 22 12 12 22 2 12Z" fill={fills[props.color ?? "brand"]} />
      <path d="M12 2 22 12 12 12Z" fill="rgba(255, 255, 255, 0.45)" />
      <path d="M2 12 12 12 12 22Z" fill="rgba(27, 18, 89, 0.18)" />
    </svg>
  );
}
