import { leftWing, leftWingBox } from "@repo/tokens/mark";
import type { CSSProperties, ReactNode } from "react";
import { cx } from "../cx";
import classes from "./decor.module.css";

/** Decorative colours: an audience/brand tone or the logo's gold. */
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
  /** Bob and twinkle in place. */
  float?: boolean;
  /** Wander slowly on a loose loop. */
  drift?: boolean;
  /** A slow wingbeat: rocks back and forth from the shape's root. */
  sway?: boolean;
  /** Mirror it, e.g. a right wing from the left one. */
  flip?: boolean;
  /** Seconds into its motion it starts, so neighbours don't move in step. */
  delay?: number;
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
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
    animationDelay: p.delay ? `${-p.delay}s` : undefined,
  };
}

function shapeClass(p: ShapeProps) {
  return cx(
    classes.shape,
    p.float && classes.float,
    p.drift && classes.drift,
    p.sway && classes.sway,
    p.hideOnMobile && classes.hideMobile,
    p.hideOnTablet && classes.hideTablet,
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
 * The logo's left wing on its own (its long sweep, tip and two feathers),
 * big and faint, best bleeding off a band's corner. `flip` makes it a right
 * wing; `sway` rocks it slowly from its root, like a wingbeat.
 */
export function Wing(props: ShapeProps) {
  const { x, y, width, height } = leftWingBox;
  return (
    <svg
      aria-hidden="true"
      className={shapeClass(props)}
      style={{
        ...shapeStyle(props),
        // Rock from where the wing meets the body.
        transformOrigin: props.flip ? "6% 92%" : "94% 92%",
      }}
      viewBox={`${x} ${y} ${width} ${height}`}
    >
      <g
        fill={fills[props.color ?? "tone"]}
        transform={
          props.flip ? `matrix(-1 0 0 1 ${2 * x + width} 0)` : undefined
        }
      >
        {leftWing.map((d) => (
          <path key={d.slice(0, 32)} d={d} />
        ))}
      </g>
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

/** A small glint: a diamond of light, lit on one side. */
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
