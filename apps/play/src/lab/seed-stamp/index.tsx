// Seed Stamp: Seed Count without the keypad. Fence the field into parts, build
// one row of each part out of 10, 5 and 1 chunks, stamp that row down as many
// times as the part has rows, then plant. The count is never typed: it comes
// from the row you built and how many times you stamped it. Planting sows
// each part row by row; a part with too few stamped rows stays bare, one with
// too many spills over. Rough prototype; see ../README.md.
import { palette } from "@repo/tokens";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  title: "Seed Stamp",
  pitch:
    "A field, 6 rows by 27 columns. Put up your fence (one at G3 and G4, one each way at G5) to split it into parts you can work out, build one row of each part from 10, 5 and 1 chunks, stamp the row down once per row of the part, then plant. A part with too few rows stays bare; one with too many spills over.",
  expectations: ["math-2020.g3.B2.6", "math-2020.g4.B2.5", "math-2020.g5.B2.6"],
  misconceptions: [
    {
      id: "tens-times-tens-as-ones",
      fails:
        "At G5, stamping the 20 × 30 part's row twice (counting the tens of 20, not its 20 rows): two rows sprout and eighteen rows of that part stay bare.",
    },
    {
      id: "drops-partial-products",
      fails:
        "At G4, building and stamping only the 6 × 20 part of 6 × 27 and leaving the 6 × 7 part: its dashed outline stays bare. At G5, covering only 20 × 30 and 4 × 8 of 24 × 38 leaves the two other parts bare.",
    },
    {
      id: "stamps-the-wrong-side",
      fails:
        "Stamping a 6 × 9 part's row of 9 nine times (the columns, not the rows): six rows sprout and three spill over, shown as +3 rows.",
    },
  ],
  sampleTask:
    "math-2020.g3.B2.6, sample task 1: 9 rows of corn with 6 plants in each row, built as repeated equal groups. Also math-2020.g4.B2.5's 6 by 12 rectangle split into 6 × 10 and 6 × 2, and math-2020.g5.B2.6's 24 × 38 area model cut into four partial products matching the algorithm.",
  fun: "Farming games' calm loop (Stardew Valley, Minecraft): lay out a field, plant it and watch it grow. Stamping a row down is the satisfying repeat, like laying fence posts or crop rows; planting is the reveal.",
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
const chunks = [10, 5, 1];
const chunkFill: Record<number, string> = {
  10: palette.sky[3],
  5: palette.sunshine[3],
  1: palette.leaf[3],
};
const maxStamps = 40;

const tensOf = (n: number) =>
  Array.from({ length: Math.ceil(n / 10) - 1 }, (_, i) => (i + 1) * 10);

const rand = (lo: number, hi: number) =>
  lo + Math.floor(Math.random() * (hi - lo + 1));

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

/** Fences per grade: G3 one, optional; G4 one across the long side; G5 one each way. */
function budget(grade: number) {
  if (grade <= 3)
    return { col: 1, row: 1, total: 1, required: false, workableOnly: false };
  if (grade === 4)
    return { col: 1, row: 0, total: 1, required: true, workableOnly: false };
  return { col: 1, row: 1, total: 2, required: true, workableOnly: true };
}

function drop(fences: Fences, axis: Axis, at: number, total: number): Fences {
  if (fences[axis].includes(at))
    return { ...fences, [axis]: fences[axis].filter((f) => f !== at) };
  if (total === 1) return { col: [], row: [], [axis]: [at] };
  return { ...fences, [axis]: [at] };
}

const friendly = (n: number) => n < 10 || n % 10 === 0;

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

const sumOf = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

export default function SeedStamp({ grade, Avatar, speak }: PrototypeProps) {
  const [round, setRound] = useState(0);
  const [field, setField] = useState(() => makeField(grade));
  const [fences, setFences] = useState<Fences>({ col: [], row: [] });
  const [ghost, setGhost] = useState<{ axis: Axis; at: number } | null>(null);
  // The chunks of each part's row, and the rows stamped; both by part key.
  const [rowOf, setRowOf] = useState<Record<string, number[]>>({});
  const [stamped, setStamped] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
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
  const workable = (p: Part) =>
    !rules.workableOnly || (friendly(p.rows) && friendly(p.cols));
  const rowChunks = (p: Part) => rowOf[p.key] ?? [];
  const rowDone = (p: Part) => sumOf(rowChunks(p)) === p.cols;
  // Rows that count: a part's stamps only count once its row is complete.
  const rowsIn = (p: Part) => (rowDone(p) ? (stamped[p.key] ?? 0) : 0);
  const seedsIn = (p: Part) => rowsIn(p) * p.cols;
  const tooBig = "That part is too big to work out. Try moving a fence.";
  const fenceCount = fences.col.length + fences.row.length;
  const done = phase === "exact" && round >= fieldsPerRound - 1;
  const sum = fieldParts.reduce((s, p) => s + seedsIn(p), 0);

  useEffect(() => {
    speak(
      `This field has ${field.rows} rows of ${field.cols}. Build a row, then stamp it down.`,
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

  const addChunk = (n: number) => {
    const left = current.cols - sumOf(rowChunks(current));
    if (n > left) {
      const text = `${n} doesn't fit: only ${left} left in the row.`;
      setNote(text);
      speak(text);
      return;
    }
    setNote("");
    setRowOf({ ...rowOf, [current.key]: [...rowChunks(current), n] });
  };

  const undoChunk = () => {
    setNote("");
    // Changing the row clears its stamps: they were copies of the old row.
    setRowOf({ ...rowOf, [current.key]: rowChunks(current).slice(0, -1) });
    setStamped({ ...stamped, [current.key]: 0 });
  };

  const stamp = (by: number) =>
    setStamped({
      ...stamped,
      [current.key]: Math.max(
        0,
        Math.min(maxStamps, (stamped[current.key] ?? 0) + by),
      ),
    });

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
      speak("Build a row and stamp it down first.");
      return;
    }
    setPhase("planting");
    setStep(0);
    const steps = Math.max(
      ...fieldParts.map((p) => Math.min(rowsIn(p), p.rows)),
      1,
    );
    const tick = Math.max(60, Math.min(220, 2400 / steps));
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setStep(i);
      if (i < steps) return;
      clearInterval(timer);
      const wrong = fieldParts.find((p) => rowsIn(p) !== p.rows);
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
      speak(
        rowsIn(wrong) < wrong.rows
          ? `${name} still has bare rows.`
          : `${name} has too many rows.`,
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
    setRowOf({});
    setStamped({});
    setSelected(null);
    setNote("");
    setStep(0);
    setPhase("plan");
  };

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

  const labelSize = (p: Part) =>
    Math.min(26, Math.max(13, Math.min(p.cols, p.rows * 2.5) * unit * 0.26));

  const sprout = phase === "exact" ? palette.sunshine[5] : palette.leaf[5];

  // The skip count of the current part's stamps: one row's worth per stamp.
  const stampsHere = rowDone(current) ? (stamped[current.key] ?? 0) : 0;
  const counts = Array.from(
    { length: stampsHere },
    (_, i) => (i + 1) * current.cols,
  );
  const countText =
    counts.length > 6 ? `… ${counts.slice(-5).join(", ")}` : counts.join(", ");

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
            id="stamp-sprouts"
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
            id="stamp-soil"
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
        <rect x={fx} y={fy} width={fw} height={fh} fill="url(#stamp-soil)" />
        {(ghost ? shownParts : fieldParts).map((p) => {
          const rows = ghost ? 0 : rowsIn(p);
          const sownRows = Math.min(rows, p.rows, step);
          const settled = phase === "missed" || phase === "exact";
          const x = fx + p.c * unit;
          const y = fy + p.r * unit;
          const isSelected =
            phase === "plan" && !ghost && p.key === current.key;
          const size = labelSize(p);
          return (
            <g
              key={p.key}
              onPointerDown={() => {
                if (phase !== "plan") return;
                setSelected(p.key);
                setNote("");
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
              {sownRows > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={p.cols * unit}
                  height={sownRows * unit}
                  fill="url(#stamp-sprouts)"
                />
              )}
              {settled && rows < p.rows && (
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
              {settled && rows > p.rows && (
                <text
                  x={x + (p.cols * unit) / 2}
                  y={y + (p.rows * unit) / 2 + 12}
                  textAnchor="middle"
                  fontSize={30}
                  fontWeight={900}
                  fill={palette.ember[6]}
                  stroke="white"
                  strokeWidth={6}
                  paintOrder="stroke"
                >
                  +{rows - p.rows} rows
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
              {phase === "plan" && (
                <text
                  x={x + (p.cols * unit) / 2}
                  y={y + (p.rows * unit) / 2 + size * 0.35}
                  textAnchor="middle"
                  fontSize={size}
                  fontWeight={800}
                  fill="white"
                  stroke={palette.sunshine[9]}
                  strokeWidth={5}
                  paintOrder="stroke"
                  pointerEvents="none"
                >
                  {p.rows} × {p.cols}
                  {!ghost && !workable(p) ? " 🔒" : ""}
                </text>
              )}
            </g>
          );
        })}
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
      <div
        style={{
          position: "absolute",
          right: "2%",
          top: "2%",
          width: "32%",
          display: "grid",
          gap: 8,
          justifyItems: "stretch",
        }}
      >
        {/* The selected part: build its row, then stamp it down */}
        <div style={{ fontSize: 22, fontWeight: 800, color: palette.ink[9] }}>
          {current.rows} × {current.cols}
          {workable(current) ? "" : " 🔒"}
        </div>
        <div
          style={{
            display: "flex",
            height: 44,
            borderRadius: 10,
            overflow: "hidden",
            border: `3px dashed ${palette.sunshine[8]}`,
            background: palette.sunshine[0],
          }}
        >
          {rowChunks(current).map((n, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: chunks repeat; order is the identity
              key={i}
              style={{
                width: `${(n / current.cols) * 100}%`,
                background: chunkFill[n],
                borderRight: `2px solid ${palette.ink[6]}`,
                display: "grid",
                placeItems: "center",
                fontSize: 18,
                fontWeight: 900,
                color: palette.ink[9],
              }}
            >
              {n}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {chunks.map((n) => (
            <button
              type="button"
              key={n}
              disabled={
                phase !== "plan" ||
                !workable(current) ||
                sumOf(rowChunks(current)) >= current.cols
              }
              onClick={() => addChunk(n)}
              style={{
                flex: 1,
                minHeight: 56,
                borderRadius: 14,
                border: `3px solid ${palette.ink[6]}`,
                background: chunkFill[n],
                fontSize: 24,
                fontWeight: 900,
                color: palette.ink[9],
              }}
            >
              +{n}
            </button>
          ))}
          <button
            type="button"
            disabled={phase !== "plan" || rowChunks(current).length === 0}
            onClick={undoChunk}
            style={smallButton}
          >
            Undo
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            disabled={phase !== "plan" || !rowDone(current)}
            onClick={() => stamp(1)}
            style={{ ...bigButton(palette.sky[6]), flex: 1, minWidth: 0 }}
          >
            Stamp row ↓
          </button>
          <button
            type="button"
            disabled={phase !== "plan" || stampsHere === 0}
            onClick={() => stamp(-1)}
            style={smallButton}
          >
            −1
          </button>
        </div>
        <div
          style={{
            minHeight: 26,
            fontSize: 20,
            fontWeight: 800,
            color: palette.ink[7],
          }}
        >
          {note ||
            (stampsHere > 0
              ? `${stampsHere} × ${current.cols}: ${countText}`
              : rowDone(current)
                ? "Row built. Stamp it down."
                : `Fill the row: ${current.cols} wide.`)}
        </div>
        {fieldParts.length > 1 && (
          <div style={{ display: "grid", gap: 4 }}>
            {fieldParts.map((p, i) => (
              <button
                type="button"
                key={p.key}
                disabled={phase !== "plan"}
                onClick={() => {
                  setSelected(p.key);
                  setNote("");
                  if (!workable(p)) speak(tooBig);
                }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  minHeight: 44,
                  alignItems: "center",
                  padding: "0 14px",
                  borderRadius: 10,
                  border: `3px solid ${p.key === current.key && phase === "plan" ? palette.sunshine[5] : "transparent"}`,
                  background: palette.sand[0],
                  fontSize: 20,
                  fontWeight: 800,
                  color: palette.ink[9],
                }}
              >
                <span style={{ color: palette.ink[6] }}>
                  {i > 0 ? "+ " : ""}
                  {p.rows} × {p.cols}
                </span>
                <span>
                  {workable(p) ? (rowDone(p) ? seedsIn(p) : "?") : "🔒"}
                </span>
              </button>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "2px 17px 0",
                borderTop: `3px solid ${palette.ink[9]}`,
                fontSize: 24,
                fontWeight: 900,
                color: palette.ink[9],
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
            style={{ fontSize: 16, color: palette.ink[6], textAlign: "center" }}
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
  fontSize: 26,
  fontWeight: 800,
  borderRadius: 16,
  border: "none",
  background,
  color: "white",
});

const smallButton = {
  minWidth: 64,
  minHeight: 56,
  borderRadius: 12,
  border: `2px solid ${palette.ink[4]}`,
  background: palette.sand[0],
  fontSize: 18,
  fontWeight: 800,
  color: palette.ink[7],
};
