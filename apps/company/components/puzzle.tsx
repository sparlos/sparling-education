import styles from "./puzzle.module.css";

// The hero's engraving: four puzzle pieces, one per subject (fractions,
// reading, science, geography), that glide together and lock on load. The
// lesson and the play fitting together, without naming any one game.

const size = 110;
const knob = { from: 44, to: 66, radius: 14 };
/** Which way each seam's knob points: 1 into the right piece, -1 the left. */
const seams = [1, -1, 1];

function piecePath(i: number) {
  const left = i * size;
  const right = left + size;
  let d = `M ${left} 0 H ${right}`;
  const rightSeam = seams[i];
  d += rightSeam
    ? ` V ${knob.from} A ${knob.radius} ${knob.radius} 0 1 ${rightSeam > 0 ? 1 : 0} ${right} ${knob.to} V ${size}`
    : ` V ${size}`;
  d += ` H ${left}`;
  const leftSeam = seams[i - 1];
  d += leftSeam
    ? ` V ${knob.to} A ${knob.radius} ${knob.radius} 0 1 ${leftSeam > 0 ? 0 : 1} ${left} ${knob.from} Z`
    : " Z";
  return d;
}

function Glyph({ index, cx, cy }: { index: number; cx: number; cy: number }) {
  switch (index) {
    case 0:
      return (
        <>
          <path
            className={styles.brassFill}
            d={`M ${cx} ${cy} V ${cy - 20} A 20 20 0 0 1 ${cx + 20} ${cy} Z`}
          />
          <circle cx={cx} cy={cy} r={20} />
          <path
            d={`M ${cx} ${cy - 20} V ${cy + 20} M ${cx - 20} ${cy} H ${cx + 20}`}
          />
        </>
      );
    case 1:
      return (
        <>
          <text
            className={styles.letters}
            x={cx}
            y={cy + 11}
            textAnchor="middle"
          >
            Aa
          </text>
          <path
            className={styles.brass}
            d={`M ${cx - 18} ${cy + 20} H ${cx + 18}`}
          />
        </>
      );
    case 2:
      return (
        <>
          <path
            d={`M ${cx - 7} ${cy - 20} V ${cy - 6} L ${cx - 18} ${cy + 15} Q ${cx - 20} ${cy + 20} ${cx - 14} ${cy + 20} H ${cx + 14} Q ${cx + 20} ${cy + 20} ${cx + 18} ${cy + 15} L ${cx + 7} ${cy - 6} V ${cy - 20} M ${cx - 11} ${cy - 20} H ${cx + 11}`}
          />
          <path
            className={styles.brass}
            d={`M ${cx - 13} ${cy + 7} H ${cx + 13}`}
          />
          <circle className={styles.brassFill} cx={cx - 3} cy={cy + 13} r={2} />
          <circle
            className={styles.brassFill}
            cx={cx + 5}
            cy={cy + 2}
            r={1.5}
          />
        </>
      );
    default:
      return (
        <>
          <circle cx={cx} cy={cy} r={20} />
          <ellipse cx={cx} cy={cy} rx={8} ry={20} />
          <path
            className={styles.brass}
            d={`M ${cx - 20} ${cy} H ${cx + 20}`}
          />
          <path
            d={`M ${cx - 17} ${cy - 10} H ${cx + 17} M ${cx - 17} ${cy + 10} H ${cx + 17}`}
          />
        </>
      );
  }
}

export function Puzzle({ className }: { className?: string }) {
  return (
    <svg
      className={[styles.puzzle, className].filter(Boolean).join(" ")}
      viewBox="-10 -10 460 170"
      aria-hidden="true"
    >
      {seams.concat(0).map((_, i) => (
        <g
          // biome-ignore lint/suspicious/noArrayIndexKey: four fixed pieces
          key={i}
          className={styles.piece}
          data-piece={i}
        >
          <path className={styles.outline} d={piecePath(i)} />
          <g className={styles.glyph}>
            <Glyph index={i} cx={i * size + size / 2} cy={size / 2} />
          </g>
        </g>
      ))}
      <path className={styles.rule} d="M 160 145 H 280" pathLength={1} />
    </svg>
  );
}
