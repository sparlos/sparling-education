// Fraction notation: the only text a student needs, and what's being taught.
import type { Fraction } from "../rules/course.ts";
import styles from "./hop.module.css";

/** Stacked notation in HTML: 3 over 8. A whole number is shown as itself. */
export function Frac({ n, d }: Fraction) {
  if (d === 1) return <span>{n}</span>;
  return (
    <span className={styles.frac} data-frac={`${n}/${d}`}>
      <span>{n}</span>
      <span className={styles.fracBar} />
      <span>{d}</span>
    </span>
  );
}

/** Stacked notation in the course's SVG, centred on `x`, its top at `y`. */
export function SvgFrac({
  n,
  d,
  x,
  y,
  size,
  fill,
}: Fraction & { x: number; y: number; size: number; fill: string }) {
  const width = size * 0.62 * Math.max(String(n).length, String(d).length);
  return (
    <g
      fill={fill}
      fontSize={size}
      fontWeight={800}
      textAnchor="middle"
      data-frac={`${n}/${d}`}
    >
      <text x={x} y={y + size * 0.85}>
        {n}
      </text>
      <rect
        x={x - width / 2 - 1}
        y={y + size * 1.02}
        width={width + 2}
        height={Math.max(2, size / 9)}
        rx={1}
      />
      <text x={x} y={y + size * 2.05}>
        {d}
      </text>
    </g>
  );
}
