import type { CSSProperties, ReactNode } from "react";
import classes from "./decor.module.css";

/** Decorative colours: an audience/brand tone or a fixed accent. */
type DecorColor =
  | "tone"
  | "tone-soft"
  | "brand"
  | "educator"
  | "parent"
  | "student";

const fills: Record<DecorColor, string> = {
  tone: "var(--tone-fill)",
  "tone-soft": "var(--tone-soft)",
  brand: "var(--k-brand-fill)",
  educator: "var(--k-educator-fill)",
  parent: "var(--k-parent-fill)",
  student: "var(--k-student-fill)",
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
  return [
    classes.shape,
    p.float && classes.float,
    p.hideOnMobile && classes.hideMobile,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Absolutely positioned, non-interactive layer for decorative shapes. */
export function DecorLayer({ children }: { children: ReactNode }) {
  return (
    <div className={classes.layer} aria-hidden="true">
      {children}
    </div>
  );
}

/** Soft organic blob. */
export function Blob(props: ShapeProps) {
  return (
    <svg
      aria-hidden="true"
      className={shapeClass(props)}
      style={shapeStyle(props)}
      viewBox="0 0 200 200"
    >
      <path
        fill={fills[props.color ?? "tone-soft"]}
        d="M43.6,-58.7C55.4,-50.3,62.6,-35.4,67.6,-19.6C72.6,-3.8,75.5,12.9,70.2,26.6C64.9,40.3,51.4,51,36.5,58.8C21.6,66.6,5.3,71.5,-11.6,70.8C-28.5,70.1,-46,63.8,-57.6,51.6C-69.2,39.4,-74.9,21.2,-74.4,3.6C-73.9,-14,-67.1,-31,-55.6,-39.6C-44.1,-48.2,-27.9,-48.4,-13.1,-56.1C1.7,-63.8,31.8,-67.1,43.6,-58.7Z"
        transform="translate(100 100)"
      />
    </svg>
  );
}

/** Four-point sparkle. */
export function Sparkle(props: ShapeProps) {
  return (
    <svg
      aria-hidden="true"
      className={shapeClass(props)}
      style={shapeStyle(props)}
      viewBox="0 0 24 24"
    >
      <path
        fill={fills[props.color ?? "student"]}
        d="M12 0c.9 6.3 5.1 10.6 12 12-6.9 1.4-11.1 5.7-12 12-.9-6.3-5.1-10.6-12-12C6.9 10.6 11.1 6.3 12 0z"
      />
    </svg>
  );
}

/** Small rising ember: a rounded diamond. */
export function Ember(props: ShapeProps) {
  return (
    <svg
      aria-hidden="true"
      className={shapeClass(props)}
      style={shapeStyle(props)}
      viewBox="0 0 24 24"
    >
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        rx="4"
        transform="rotate(45 12 12)"
        fill={fills[props.color ?? "brand"]}
      />
    </svg>
  );
}
