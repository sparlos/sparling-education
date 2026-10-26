// Seed Count: a field with its rows and columns marked. Fence it into parts
// (a fence budget per grade keeps the split to tens and ones, or known facts),
// fill each part's seed bag with 1000s, 100s, 10s, 5s and 1s, then plant.
// Every part sows its own bag, row by row: a part with too few seeds stays
// bare, one with too many spills over. Rough prototype; see ../README.md.
import { palette } from "@repo/tokens";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  title: "Seed Count",
  pitch:
    "A field, 6 rows by 27 columns. Put up your fence (one at G3 and G4, one each way at G5) to split it into parts you can work out, fill each part's seed bag (100s, 10s, 5s, 1s), then plant. Each part sows its own bag: a wrong part stays bare or spills over.",
  expectations: ["math-2020.g3.B2.6", "math-2020.g4.B2.5", "math-2020.g5.B2.6"],
  misconceptions: [
    {
      id: "adds-instead-of-multiplies",
      fails:
        "At G3, bagging 6 + 9 = 15 seeds for a 6 by 9 field: one row and a bit are planted, and the rest of the field stays bare.",
    },
    {
      id: "drops-partial-products",
      fails:
        "At G4, bagging 120 for the 6 × 20 part and only 7 for the 6 × 7 part (6 × 27 = 120 + 7): the 6 × 7 part gets one row and five rows stay bare. At G5, bagging only 20 × 30 and 4 × 8 for 24 × 38: the two other parts stay completely bare.",
    },
    {
      id: "tens-times-tens-as-ones",
      fails:
        "At G5, bagging 60 seeds for the 20 × 30 part: three rows sprout and the rest of that part stays bare.",
    },
  ],
  sampleTask:
    "math-2020.g3.B2.6, sample task 1: 9 rows of corn with 6 plants in each row, counted by chunking the array into known facts. Also math-2020.g4.B2.5's 27 by 6 rectangle split into 20 × 6 and 7 × 6, and math-2020.g5.B2.6's 78 m by 65 m orchard split into four parts, each partial product matching a line of the algorithm.",
  fun: "Farming games' calm loop (Stardew Valley, Minecraft): lay out a field, plant it and watch it grow. Planting is the reveal: every part sows at once, row by row, and you watch each count play out, landing exactly or leaving a bare patch right where you went wrong.",
};

interface Field {
  rows: number;
  cols: number;
}

interface Part {
  key: string;
  r: number;
  c: number;
  rows: number;
  cols: number;
}

interface Fences {
  col: number[];
  row: number[];
}

type Axis = "col" | "row";
type Phase = "plan" | "planting" | "missed" | "exact";

const fieldsPerRound = 5;
const W = 1300;
const H = 580;
const area = { x: 110, y: 110, w: 700, h: 420 };

/** The multiples of ten strictly inside a side. */
const tensOf = (n: number) =>
  Array.from({ length: Math.ceil(n / 10) - 1 }, (_, i) => (i + 1) * 10);

const rand = (lo: number, hi: number) =>
  lo + Math.floor(Math.random() * (hi - lo + 1));

// Two-digit sides always have ones, so the tens-and-ones split is a real one.
const twoDigit = (lo: number, hi: number) => {
  for (;;) {
    const n = rand(lo, hi);
    if (n % 10 !== 0) return n;
  }
};

function makeField(grade: number): Field {
  if (grade <= 3) return { rows: rand(3, 9), cols: rand(4, 10) };
  if (grade === 4) return { rows: rand(3, 9), cols: twoDigit(12, 49) };
  return { rows: twoDigit(12, 29), cols: twoDigit(12, 39) };
}

/**
 * How many fences each grade gets. G3: one, either way, and optional (a
 * small field may be a known fact). G4: one across the long side. G5: one
 * each way, making the area model's four parts. G4 and G5 must use them.
 * At G5 only workable parts can be bagged, so only the place-value split
 * works; G4 also accepts splits like 25 | 2, as its sample task does.
 */
function budget(grade: number) {
  if (grade <= 3)
    return { col: 1, row: 1, total: 1, required: false, workableOnly: false };
  if (grade === 4)
    return { col: 1, row: 0, total: 1, required: true, workableOnly: false };
  return { col: 1, row: 1, total: 2, required: true, workableOnly: true };
}

/** The fences after dropping one at `at`: on an existing fence it's removed; otherwise it moves the old one. */
function drop(fences: Fences, axis: Axis, at: number, total: number): Fences {
  if (fences[axis].includes(at))
    return { ...fences, [axis]: fences[axis].filter((f) => f !== at) };
  if (total === 1) return { col: [], row: [], [axis]: [at] };
  return { ...fences, [axis]: [at] };
}

/** A side you can work with from known facts: a single digit or whole tens. */
const friendly = (n: number) => n < 10 || n % 10 === 0;

/** The parts the fences make: top to bottom, left to right. */
function parts(field: Field, fences: Fences): Part[] {
  const cs = [0, ...[...fences.col].sort((a, b) => a - b), field.cols];
  const rs = [0, ...[...fences.row].sort((a, b) => a - b), field.rows];
  const out: Part[] = [];
  for (let i = 0; i < rs.length - 1; i++)
    for (let j = 0; j < cs.length - 1; j++) {
      const r = rs[i] as number;
      const c = cs[j] as number;
      const rows = (rs[i + 1] as number) - r;
      const cols = (cs[j + 1] as number) - c;
      out.push({ key: `${r},${c},${rows},${cols}`, r, c, rows, cols });
    }
  return out;
}

export default function SeedCount({ grade, Avatar, speak }: PrototypeProps) {
  const [round, setRound] = useState(0);
  const [field, setField] = useState(() => makeField(grade));
  const [fences, setFences] = useState<Fences>({ col: [], row: [] });
  const [ghost, setGhost] = useState<{ axis: Axis; at: number } | null>(null);
  // Seeds bagged for each part, by part key; kept while the part exists.
  const [bagged, setBagged] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  // Rows sown so far in every part at once.
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("plan");
  const svgRef = useRef<SVGSVGElement>(null);

  const rules = budget(grade);
  const total = field.rows * field.cols;
  const unit = Math.min(area.w / field.cols, area.h / field.rows);
  const fx = area.x;
  const fy = area.y;
  const fw = unit * field.cols;
  const fh = unit * field.rows;
  const shown = ghost
    ? drop(fences, ghost.axis, ghost.at, rules.total)
    : fences;
  const fieldParts = parts(field, fences);
  const shownParts = parts(field, shown);
  const current =
    fieldParts.find((p) => p.key === selected) ?? (fieldParts[0] as Part);
  const seedsIn = (p: Part) => bagged[p.key] ?? 0;
  const workable = (p: Part) =>
    !rules.workableOnly || (friendly(p.rows) && friendly(p.cols));
  const tooBig = "That part is too big to work out. Try moving a fence.";
  const sum = fieldParts.reduce(
    (s, p) => s + (workable(p) ? seedsIn(p) : 0),
    0,
  );
  const bags = grade >= 5 ? [1000, 100, 10, 5, 1] : [100, 10, 5, 1];
  const fenceCount = fences.col.length + fences.row.length;
  const done = phase === "exact" && round >= fieldsPerRound - 1;

  useEffect(() => {
    speak(
      `This field has ${field.rows} rows of ${field.cols}. How many seeds will fill it?`,
    );
  }, [field, speak]);

  const point = (event: { clientX: number; clientY: number }) => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
    return { x: p.x, y: p.y };
  };

  // Fences are placed by pressing on a ruler and sliding; the ghost shows
  // where it will go and the parts it makes.
  const fenceAt = (event: PointerEvent<SVGElement>, axis: Axis) => {
    const { x, y } = point(event);
    const at =
      axis === "col"
        ? Math.round((x - fx) / unit)
        : Math.round((y - fy) / unit);
    const max = axis === "col" ? field.cols : field.rows;
    return Math.max(1, Math.min(max - 1, at));
  };

  const rulerDown = (event: PointerEvent<SVGElement>, axis: Axis) => {
    if (phase !== "plan") return;
    svgRef.current?.setPointerCapture(event.pointerId);
    setGhost({ axis, at: fenceAt(event, axis) });
  };

  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!ghost) return;
    setGhost({ axis: ghost.axis, at: fenceAt(event, ghost.axis) });
  };

  const up = () => {
    if (!ghost) return;
    setFences(shown);
    setGhost(null);
  };

  const plant = () => {
    if (rules.required && fenceCount < rules.total) {
      speak(
        rules.total === 1
          ? "Put up your fence first."
          : "Put up both fences first.",
      );
      return;
    }
    if (fieldParts.some((p) => !workable(p))) {
      speak(tooBig);
      return;
    }
    if (sum === 0) {
      speak("Put some seeds in the bags first.");
      return;
    }
    setPhase("planting");
    setStep(0);
    const steps = Math.max(
      ...fieldParts.map((p) =>
        Math.min(Math.ceil(seedsIn(p) / p.cols), p.rows),
      ),
      1,
    );
    const tick = Math.max(40, Math.min(160, 2400 / steps));
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setStep(i);
      if (i < steps) return;
      clearInterval(timer);
      const wrong = fieldParts.find((p) => seedsIn(p) !== p.rows * p.cols);
      if (!wrong) {
        setPhase("exact");
        const sums =
          fieldParts.length > 1
            ? `${fieldParts.map((p) => p.rows * p.cols).join(" plus ")} is ${total}. `
            : "";
        speak(
          `The whole field is planted! ${sums}${field.rows} rows of ${field.cols} is ${total}.`,
        );
        return;
      }
      setPhase("missed");
      const name =
        fieldParts.length > 1
          ? `The ${wrong.rows} by ${wrong.cols} part`
          : "The field";
      const off = seedsIn(wrong) - wrong.rows * wrong.cols;
      speak(
        off < 0
          ? `${name} is short: ${-off} spots are still bare.`
          : `${name} has ${off} seeds left over.`,
      );
    }, tick);
  };

  const retry = () => {
    setPhase("plan");
    setStep(0);
  };

  const next = () => {
    setRound(done ? 0 : round + 1);
    setField(makeField(grade));
    setFences({ col: [], row: [] });
    setBagged({});
    setSelected(null);
    setStep(0);
    setPhase("plan");
  };

  const addSeeds = (n: number) =>
    setBagged({ ...bagged, [current.key]: Math.max(0, seedsIn(current) + n) });

  const mood =
    phase === "exact"
      ? "cheering"
      : phase === "missed"
        ? "encouraging"
        : "thinking";

  const fenceLines = (axis: Axis) =>
    shown[axis].map((at) => {
      const isGhost = ghost?.axis === axis && ghost.at === at;
      const style = {
        stroke: isGhost ? palette.ember[5] : palette.ink[9],
        strokeWidth: 5,
        strokeDasharray: isGhost ? "10 6" : undefined,
      };
      return axis === "col" ? (
        <line
          key={`c${at}`}
          x1={fx + at * unit}
          x2={fx + at * unit}
          y1={fy - 46}
          y2={fy + fh}
          {...style}
        />
      ) : (
        <line
          key={`r${at}`}
          x1={fx - 46}
          x2={fx + fw}
          y1={fy + at * unit}
          y2={fy + at * unit}
          {...style}
        />
      );
    });

  // The length of each part along a ruler, between the fences (and the ghost).
  const rulerLabels = (axis: Axis) => {
    const max = axis === "col" ? field.cols : field.rows;
    const cuts = [0, ...[...shown[axis]].sort((a, b) => a - b), max];
    return cuts.slice(0, -1).map((from, i) => {
      const to = cuts[i + 1] as number;
      const mid = ((from + to) / 2) * unit;
      return (
        <text
          key={`${axis}${from}`}
          x={axis === "col" ? fx + mid : fx - 20}
          y={axis === "col" ? fy - 16 : fy + mid + 10}
          textAnchor={axis === "col" ? "middle" : "end"}
          fontSize={28}
          fontWeight={800}
          fill={palette.ink[9]}
          pointerEvents="none"
        >
          {to - from}
        </text>
      );
    });
  };

  const sprout = phase === "exact" ? palette.sunshine[5] : palette.leaf[5];
  // Whether a part's length label on the row ruler sits near a ten's tick.
  const rowLabelNear = (t: number) => {
    const cuts = [0, ...[...shown.row].sort((a, b) => a - b), field.rows];
    return cuts
      .slice(0, -1)
      .some(
        (from, i) =>
          Math.abs(((from + (cuts[i + 1] as number)) / 2 - t) * unit) < 26,
      );
  };

  // Tick marks and numbers for every ten along a ruler.
  const tens = (axis: Axis) => {
    if (rules[axis] === 0) return null;
    const max = axis === "col" ? field.cols : field.rows;
    // A fence on a ten carries its own label; the tick would sit on it.
    return tensOf(max).map((t) =>
      axis === "col" ? (
        <g key={`kc${t}`} pointerEvents="none">
          <line
            x1={fx + t * unit}
            x2={fx + t * unit}
            y1={fy - 14}
            y2={fy - 4}
            stroke={palette.ink[6]}
            strokeWidth={3}
          />
          <text
            opacity={shown.col.includes(t) ? 0 : 1}
            x={fx + t * unit}
            y={fy - 44}
            textAnchor="middle"
            fontSize={15}
            fontWeight={700}
            fill={palette.ink[6]}
          >
            {t}
          </text>
        </g>
      ) : (
        <g key={`kr${t}`} pointerEvents="none">
          <line
            x1={fx - 14}
            x2={fx - 4}
            y1={fy + t * unit}
            y2={fy + t * unit}
            stroke={palette.ink[6]}
            strokeWidth={3}
          />
          <text
            opacity={shown.row.includes(t) || rowLabelNear(t) ? 0 : 1}
            x={fx - 58}
            y={fy + t * unit + 5}
            fontSize={15}
            fontWeight={700}
            fill={palette.ink[6]}
          >
            {t}
          </text>
        </g>
      ),
    );
  };

  const labelSize = (p: Part) =>
    Math.min(26, Math.max(13, Math.min(p.cols, p.rows * 2.5) * unit * 0.26));

  // A part's multiplication and, under it, the seeds bagged for it ("= 120",
  // or "= ?" while its bag is empty), so no part is forgotten. Only the
  // number: drawing the seeds would give the answer away. A short part puts
  // both on one line.
  const partLabel = (p: Part, x: number, y: number) => {
    const size = labelSize(p);
    const cx = x + (p.cols * unit) / 2;
    const cy = y + (p.rows * unit) / 2;
    const locked = !ghost && !workable(p);
    const planned = ghost || locked ? null : seedsIn(p) || "?";
    const sum = planned === null ? null : `= ${planned}`;
    const twoLines = p.rows * unit >= size * 2.6;
    const text = {
      x: cx,
      textAnchor: "middle" as const,
      fontSize: size,
      fontWeight: 800,
      fill: "white",
      // An outline so the label reads over the tens lines.
      stroke: palette.sunshine[9],
      strokeWidth: 5,
      paintOrder: "stroke" as const,
      pointerEvents: "none" as const,
    };
    if (!twoLines || sum === null)
      return (
        <text {...text} y={cy + size * 0.35}>
          {p.rows} × {p.cols}
          {locked ? " 🔒" : sum ? ` ${sum}` : ""}
        </text>
      );
    return (
      <g>
        <text {...text} y={cy - size * 0.2}>
          {p.rows} × {p.cols}
        </text>
        <text
          {...text}
          y={cy + size * 1.0}
          fill={planned === "?" ? palette.sunshine[2] : "white"}
        >
          {sum}
        </text>
      </g>
    );
  };

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex" }}>
      <svg
        ref={svgRef}
        role="img"
        aria-label={`A field of ${field.rows} rows of ${field.cols}`}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "100%", touchAction: "none" }}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <defs>
          <pattern
            id="sprouts"
            width={unit}
            height={unit}
            patternUnits="userSpaceOnUse"
            x={fx}
            y={fy}
          >
            <rect width={unit} height={unit} fill={palette.leaf[1]} />
            <circle
              cx={unit / 2}
              cy={unit / 2}
              r={Math.max(2, unit * 0.32)}
              fill={sprout}
            />
          </pattern>
          <pattern
            id="soil"
            width={unit}
            height={unit}
            patternUnits="userSpaceOnUse"
            x={fx}
            y={fy}
          >
            <rect width={unit} height={unit} fill={palette.sunshine[7]} />
            <rect
              width={unit}
              height={unit}
              fill="none"
              stroke={palette.sunshine[8]}
              strokeWidth={0.75}
            />
          </pattern>
        </defs>
        <rect width={W} height={H} fill={palette.leaf[0]} />
        {/* Rulers: press and slide to drop a fence */}
        {rules.col > 0 && (
          <rect
            x={fx}
            y={fy - 60}
            width={fw}
            height={56}
            rx={8}
            fill={palette.sand[2]}
            onPointerDown={(e) => rulerDown(e, "col")}
            style={{ cursor: "col-resize" }}
          />
        )}
        {rules.row > 0 && (
          <rect
            x={fx - 64}
            y={fy}
            width={60}
            height={fh}
            rx={8}
            fill={palette.sand[2]}
            onPointerDown={(e) => rulerDown(e, "row")}
            style={{ cursor: "row-resize" }}
          />
        )}
        {/* The whole field's multiplication stays up, however it's fenced */}
        <text
          x={fx + fw / 2}
          y={fy - 72}
          textAnchor="middle"
          fontSize={34}
          fontWeight={900}
          fill={palette.ink[9]}
          pointerEvents="none"
        >
          {field.rows} × {field.cols}
        </text>
        {rulerLabels("col")}
        {rulerLabels("row")}
        {tens("col")}
        {tens("row")}
        {/* The field */}
        <rect x={fx} y={fy} width={fw} height={fh} fill="url(#soil)" />
        {(ghost ? shownParts : fieldParts).map((p) => {
          const target = p.rows * p.cols;
          const seeds = ghost ? 0 : seedsIn(p);
          const sown = Math.min(seeds, target, step * p.cols);
          const fullRows = Math.floor(sown / p.cols);
          const extra = sown % p.cols;
          const settled = phase === "missed" || phase === "exact";
          const x = fx + p.c * unit;
          const y = fy + p.r * unit;
          const isSelected =
            phase === "plan" && !ghost && p.key === current.key;
          return (
            <g
              key={p.key}
              onPointerDown={() => {
                if (phase !== "plan") return;
                setSelected(p.key);
                if (!workable(p)) speak(tooBig);
              }}
              style={{ cursor: phase === "plan" ? "pointer" : undefined }}
            >
              <rect
                x={x}
                y={y}
                width={p.cols * unit}
                height={p.rows * unit}
                fill="transparent"
              />
              {fullRows > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={p.cols * unit}
                  height={fullRows * unit}
                  fill="url(#sprouts)"
                />
              )}
              {extra > 0 && (
                <rect
                  x={x}
                  y={y + fullRows * unit}
                  width={extra * unit}
                  height={unit}
                  fill="url(#sprouts)"
                />
              )}
              {settled && seeds < target && (
                <rect
                  x={x}
                  y={y}
                  width={p.cols * unit}
                  height={p.rows * unit}
                  fill="none"
                  stroke={palette.ember[4]}
                  strokeWidth={8}
                  strokeDasharray="14 8"
                />
              )}
              {settled && seeds > target && (
                <text
                  x={x + (p.cols * unit) / 2}
                  y={y + (p.rows * unit) / 2 + 12}
                  textAnchor="middle"
                  fontSize={34}
                  fontWeight={900}
                  fill={palette.ember[6]}
                  stroke="white"
                  strokeWidth={6}
                  paintOrder="stroke"
                >
                  +{seeds - target}
                </text>
              )}
              {isSelected && (
                <rect
                  x={x + 4}
                  y={y + 4}
                  width={p.cols * unit - 8}
                  height={p.rows * unit - 8}
                  fill="none"
                  stroke={palette.sunshine[3]}
                  strokeWidth={8}
                />
              )}
              {phase === "plan" && !ghost && !workable(p) && (
                <rect
                  x={x}
                  y={y}
                  width={p.cols * unit}
                  height={p.rows * unit}
                  fill={palette.ink[9]}
                  opacity={0.45}
                  pointerEvents="none"
                />
              )}
              {phase === "plan" && partLabel(p, x, y)}
            </g>
          );
        })}
        {/* Every ten, a heavier line, as in the curriculum's area model */}
        <g stroke={palette.sand[2]} strokeWidth={2.5} pointerEvents="none">
          {tensOf(field.cols).map((t) => (
            <line
              key={`tc${t}`}
              x1={fx + t * unit}
              x2={fx + t * unit}
              y1={fy}
              y2={fy + fh}
            />
          ))}
          {tensOf(field.rows).map((t) => (
            <line
              key={`tr${t}`}
              x1={fx}
              x2={fx + fw}
              y1={fy + t * unit}
              y2={fy + t * unit}
            />
          ))}
        </g>
        <rect
          x={fx}
          y={fy}
          width={fw}
          height={fh}
          fill="none"
          stroke={palette.ink[9]}
          strokeWidth={4}
          pointerEvents="none"
        />
        {fenceLines("col")}
        {fenceLines("row")}
      </svg>
      <div style={{ position: "absolute", left: 16, top: 12 }}>
        <Avatar expression={mood} size={64} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 92,
          top: 30,
          fontWeight: 800,
          fontSize: 20,
          color: palette.ink[7],
        }}
      >
        {Math.min(round + 1, fieldsPerRound)} / {fieldsPerRound}
      </div>
      {/* The bags: the selected part's on top, every part's below as a sum */}
      <div
        style={{
          position: "absolute",
          right: "2%",
          top: "2%",
          width: "32%",
          display: "grid",
          gap: 10,
          justifyItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 44,
            fontWeight: 900,
            padding: "2px 16px",
            borderRadius: 16,
            background: palette.sunshine[0],
            border: `4px solid ${palette.sunshine[7]}`,
            color: palette.ink[9],
          }}
        >
          <span style={{ fontSize: 24, color: palette.ink[7] }}>
            {current.rows} × {current.cols}
          </span>
          {workable(current) ? `🌱 ${seedsIn(current)}` : "🔒"}
          {/* Empties this part's bag */}
          <button
            type="button"
            disabled={phase !== "plan" || seedsIn(current) === 0}
            onClick={() => addSeeds(-seedsIn(current))}
            style={{
              minWidth: 72,
              minHeight: 48,
              marginLeft: 4,
              borderRadius: 12,
              border: `2px solid ${palette.ink[4]}`,
              background: palette.sand[0],
              fontSize: 18,
              fontWeight: 800,
              color: palette.ink[7],
            }}
          >
            Clear
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {bags.map((bag) => (
            <div key={bag} style={{ display: "grid", gap: 6 }}>
              <button
                type="button"
                disabled={phase !== "plan" || !workable(current)}
                onClick={() => addSeeds(bag)}
                style={{
                  width: 76,
                  height: 72,
                  borderRadius: 16,
                  border: `3px solid ${palette.sunshine[8]}`,
                  background: palette.sunshine[3],
                  fontSize: bag >= 1000 ? 22 : 26,
                  fontWeight: 900,
                  color: palette.ink[9],
                }}
              >
                +{bag}
              </button>
              <button
                type="button"
                disabled={
                  phase !== "plan" ||
                  !workable(current) ||
                  seedsIn(current) < bag
                }
                onClick={() => addSeeds(-bag)}
                style={{
                  width: 76,
                  height: 48,
                  borderRadius: 12,
                  border: `2px solid ${palette.ink[4]}`,
                  background: palette.sand[0],
                  fontSize: 20,
                  fontWeight: 800,
                  color: palette.ink[7],
                }}
              >
                −{bag}
              </button>
            </div>
          ))}
        </div>
        {/* Every part's bag, added up like the written algorithm */}
        {fieldParts.length > 1 && (
          <div
            style={{
              display: "grid",
              gap: 4,
              minWidth: 240,
              fontSize: 22,
              fontWeight: 800,
              color: palette.ink[9],
            }}
          >
            {fieldParts.map((p, i) => (
              <button
                type="button"
                key={p.key}
                disabled={phase !== "plan"}
                onClick={() => {
                  setSelected(p.key);
                  if (!workable(p)) speak(tooBig);
                }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 24,
                  minHeight: 48,
                  alignItems: "center",
                  padding: "0 14px",
                  borderRadius: 10,
                  border: `3px solid ${p.key === current.key && phase === "plan" ? palette.sunshine[5] : "transparent"}`,
                  background: palette.sand[0],
                  fontSize: 22,
                  fontWeight: 800,
                  color: palette.ink[9],
                }}
              >
                <span style={{ color: palette.ink[6] }}>
                  {i > 0 ? "+ " : ""}
                  {p.rows} × {p.cols}
                </span>
                <span>{workable(p) ? seedsIn(p) : "🔒"}</span>
              </button>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 17px 0",
                borderTop: `3px solid ${palette.ink[9]}`,
                fontSize: 28,
                fontWeight: 900,
              }}
            >
              <span>=</span>
              <span>{sum}</span>
            </div>
          </div>
        )}
        {phase === "plan" && (
          <button
            type="button"
            onClick={plant}
            style={bigButton(palette.leaf[6])}
          >
            Plant!
          </button>
        )}
        {phase === "missed" && (
          <button
            type="button"
            onClick={retry}
            style={bigButton(palette.sky[6])}
          >
            Try again
          </button>
        )}
        {phase === "exact" && (
          <button
            type="button"
            onClick={next}
            style={bigButton(palette.leaf[6])}
          >
            {done ? "Play again" : "Next field →"}
          </button>
        )}
        {phase === "plan" && fieldParts.length === 1 && (
          <div
            style={{
              fontSize: 16,
              color: palette.ink[6],
              textAlign: "center",
              maxWidth: 300,
            }}
          >
            {rules.total === 1
              ? "Slide along an edge to put up your fence."
              : "Slide along both edges to put up your fences."}
          </div>
        )}
      </div>
    </div>
  );
}

const bigButton = (background: string) => ({
  minWidth: 220,
  minHeight: 64,
  fontSize: 28,
  fontWeight: 800,
  borderRadius: 16,
  border: "none",
  background,
  color: "white",
});
