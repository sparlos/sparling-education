// Array Blast: a rectangular hole, labelled only by its sides, and a tray of
// array blocks labelled rows × columns. Drag blocks in to fill the hole
// exactly; tap a block to turn it. A filled hole blasts and shows its pieces
// as a sum of products. Rough prototype; see ../README.md.
import { palette } from "@repo/tokens";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  title: "Array Blast",
  pitch:
    "A hole in the board, labelled only by its sides (6 by 27). Drag array blocks (6 × 20, 6 × 7…) from the tray to fill it exactly, turning them with a tap. Fill it and it blasts, showing the multiplication you just built.",
  expectations: ["math-2020.g3.B2.6", "math-2020.g4.B2.5", "math-2020.g5.B2.6"],
  misconceptions: [
    {
      id: "drops-partial-products",
      fails:
        "At G4, filling 6 × 27 with 6 × 20 and a single row of 7 (as if 6 × 27 = 120 + 7): five rows of the hole stay empty. At G5, filling 24 × 38 with only 20 × 30 and 4 × 8: two whole corners stay empty.",
    },
    {
      id: "rows-columns-swapped",
      fails:
        "Dropping a 9 × 6 block into a 6-row hole without turning it: it hangs over the edge in red and bounces back to the tray.",
    },
  ],
  sampleTask:
    "math-2020.g4.B2.5, sample task 1: splitting a 27 by 6 rectangle into parts like 20 × 6 and 7 × 6 using known facts. Also math-2020.g5.B2.6's area model of 24 × 38 as four partial products, and math-2020.g3.B2.6's 6 by 9 corn array chunked into known facts.",
  fun: "Block Blast's loop: pick the block that fits, drag it in, and feel the snap and the blast when the board clears. The hole is a puzzle with near-miss decoys, so a wrong block visibly hangs over or leaves a gap.",
};

interface Block {
  id: number;
  rows: number;
  cols: number;
  color: string;
  /** Top-left cell in the hole, once placed. */
  at?: { r: number; c: number };
}

interface Task {
  rows: number;
  cols: number;
  blocks: Block[];
}

const holesPerRound = 5;
const W = 1300;
const H = 580;
// The board's area, where the hole is centred.
const board = { x: 70, y: 70, w: 720, h: 460 };
// The tray: two columns of three slots.
const tray = { x: 830, y: 20, slotW: 225, slotH: 180 };

const colors = [
  palette.sky[4],
  palette.sunshine[4],
  palette.berry[4],
  palette.leaf[4],
  palette.teal[4],
  palette.ember[3],
];

const rand = (lo: number, hi: number) =>
  lo + Math.floor(Math.random() * (hi - lo + 1));

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

function makeTask(grade: number): Task {
  let rows: number;
  let cols: number;
  let pieces: [number, number][];
  let decoys: [number, number][];
  if (grade <= 3) {
    // Up to 10 × 10, split at 5 so the 5 facts carry the rest.
    rows = rand(3, 9);
    cols = rand(6, 10);
    pieces = [
      [rows, 5],
      [rows, cols - 5],
    ];
    decoys = [
      [rows - 1, 5],
      [rows, cols - 4],
    ];
  } else if (grade === 4) {
    // Two-digit by one-digit: tens and ones.
    rows = rand(3, 9);
    const tens = 10 * rand(1, 3);
    const ones = rand(2, 9);
    cols = tens + ones;
    pieces = [
      [rows, tens],
      [rows, ones],
    ];
    // The "+ 7" mistake as a block: one row of the ones.
    decoys = [
      [1, ones],
      [rows + 1, ones === 9 ? 8 : ones + 1],
    ];
  } else {
    // Two-digit by two-digit: four partial products.
    const rt = 10 * rand(1, 2);
    const ro = rand(2, 9);
    const ct = 10 * rand(1, 3);
    const co = rand(2, 9);
    rows = rt + ro;
    cols = ct + co;
    pieces = [
      [rt, ct],
      [rt, co],
      [ro, ct],
      [ro, co],
    ];
    decoys = [
      [co === ro ? ro + 1 : co, ct],
      [rt + ro, co === 9 ? 8 : co + 1],
    ];
  }
  // Some blocks arrive turned, so reading rows and columns matters.
  const blocks = shuffle([...pieces, ...decoys]).map(([r, c], id) => {
    const turn = Math.random() < 0.35;
    return {
      id,
      rows: turn ? c : r,
      cols: turn ? r : c,
      color: colors[id % colors.length] as string,
    };
  });
  return { rows, cols, blocks };
}

interface Drag {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  moved: boolean;
}

interface Bounce {
  block: Block;
  r: number;
  c: number;
}

export default function ArrayBlast({ grade, Avatar, speak }: PrototypeProps) {
  const [round, setRound] = useState(0);
  const [task, setTask] = useState(() => makeTask(grade));
  const [blocks, setBlocks] = useState<Block[]>(task.blocks);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [bounce, setBounce] = useState<Bounce | null>(null);
  const [mood, setMood] = useState<
    "thinking" | "happy" | "encouraging" | "cheering"
  >("thinking");
  const svgRef = useRef<SVGSVGElement>(null);

  const unit = Math.min(board.w / task.cols, board.h / task.rows);
  const holeW = unit * task.cols;
  const holeH = unit * task.rows;
  const holeX = board.x + (board.w - holeW) / 2;
  const holeY = board.y + (board.h - holeH) / 2;

  const placed = blocks.filter((b) => b.at);
  const filled = placed.reduce((sum, b) => sum + b.rows * b.cols, 0);
  const cleared = filled === task.rows * task.cols;
  const done = cleared && round >= holesPerRound - 1;

  useEffect(() => {
    setBlocks(task.blocks);
    speak(`Fill the hole: ${task.rows} by ${task.cols}.`);
  }, [task, speak]);

  const point = (event: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return { x: 0, y: 0 };
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
    return { x: p.x, y: p.y };
  };

  const down = (event: PointerEvent<SVGGElement>, id: number) => {
    if (cleared) return;
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    const { x, y } = point(event);
    setDrag({ id, x, y, startX: x, startY: y, moved: false });
  };

  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const { x, y } = point(event);
    const moved =
      drag.moved || Math.hypot(x - drag.startX, y - drag.startY) > 10;
    if (moved && !drag.moved) {
      // Lift it out of the hole as soon as it moves.
      setBlocks((all) =>
        all.map((b) => (b.id === drag.id ? { ...b, at: undefined } : b)),
      );
    }
    setDrag({ ...drag, x, y, moved });
  };

  const up = () => {
    if (!drag) return;
    const block = blocks.find((b) => b.id === drag.id);
    setDrag(null);
    if (!block) return;
    if (!drag.moved) {
      if (block.at) return;
      // A tap turns it.
      setBlocks((all) =>
        all.map((b) =>
          b.id === block.id ? { ...b, rows: b.cols, cols: b.rows } : b,
        ),
      );
      speak(`${block.cols} by ${block.rows}`);
      return;
    }
    // Dropped: snap its top-left to the nearest cell, from its centre.
    const c = Math.round((drag.x - holeX) / unit - block.cols / 2);
    const r = Math.round((drag.y - holeY) / unit - block.rows / 2);
    const nearHole =
      drag.x > holeX - unit * 2 &&
      drag.x < holeX + holeW + unit * 2 &&
      drag.y > holeY - unit * 2 &&
      drag.y < holeY + holeH + unit * 2;
    if (!nearHole) return; // Back to the tray.
    const inside =
      r >= 0 &&
      c >= 0 &&
      r + block.rows <= task.rows &&
      c + block.cols <= task.cols;
    const overlaps = blocks.some(
      (b) =>
        b.at &&
        b.id !== block.id &&
        r < b.at.r + b.rows &&
        b.at.r < r + block.rows &&
        c < b.at.c + b.cols &&
        b.at.c < c + block.cols,
    );
    if (inside && !overlaps) {
      setBlocks((all) =>
        all.map((b) => (b.id === block.id ? { ...b, at: { r, c } } : b)),
      );
      const now = [...placed.filter((b) => b.id !== block.id), block];
      if (filled + block.rows * block.cols < task.rows * task.cols) {
        setMood("happy");
        return;
      }
      setMood("cheering");
      const parts = now.map((b) => `${b.rows} times ${b.cols}`).join(", plus ");
      speak(
        `Blast! ${parts}. That's ${task.rows} times ${task.cols}: ${task.rows * task.cols}.`,
      );
      return;
    }
    setMood("encouraging");
    setBounce({ block, r, c });
    speak(
      inside
        ? "It bumps into another block."
        : `A ${block.rows} by ${block.cols} block doesn't fit there.`,
    );
    setTimeout(() => setBounce(null), 900);
  };

  const next = () => {
    setRound(round + 1);
    setMood("thinking");
    setTask(makeTask(grade));
  };

  const again = () => {
    setRound(0);
    setMood("thinking");
    setTask(makeTask(grade));
  };

  // Where each tray block is drawn: scaled to fit its slot.
  const traySpot = (index: number, block: Block) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const fit = Math.min(
      (tray.slotW - 40) / block.cols,
      (tray.slotH - 70) / block.rows,
      unit,
    );
    const w = block.cols * fit;
    const h = block.rows * fit;
    const cx = tray.x + col * tray.slotW + tray.slotW / 2;
    const top = tray.y + row * tray.slotH + 10;
    return {
      x: cx - w / 2,
      y: top + (tray.slotH - 70 - h) / 2,
      w,
      h,
      fit,
      cx,
      top,
    };
  };

  const grid = (
    x: number,
    y: number,
    rows: number,
    cols: number,
    size: number,
  ) => {
    // Grid lines every cell, heavier every 10.
    const lines = [];
    for (let i = 1; i < cols; i++)
      lines.push(
        <line
          key={`c${i}`}
          x1={x + i * size}
          x2={x + i * size}
          y1={y}
          y2={y + rows * size}
          strokeWidth={i % 10 === 0 ? 2 : 0.75}
        />,
      );
    for (let i = 1; i < rows; i++)
      lines.push(
        <line
          key={`r${i}`}
          x1={x}
          x2={x + cols * size}
          y1={y + i * size}
          y2={y + i * size}
          strokeWidth={i % 10 === 0 ? 2 : 0.75}
        />,
      );
    return lines;
  };

  const blockShape = (
    block: Block,
    x: number,
    y: number,
    size: number,
    extra?: { opacity?: number; stroke?: string },
  ) => (
    <g opacity={extra?.opacity ?? 1}>
      <rect
        x={x}
        y={y}
        width={block.cols * size}
        height={block.rows * size}
        fill={block.color}
        stroke={extra?.stroke ?? palette.ink[8]}
        strokeWidth={3}
        rx={3}
      />
      <g stroke={palette.ink[8]} strokeOpacity={0.35}>
        {grid(x, y, block.rows, block.cols, size)}
      </g>
    </g>
  );

  const label = (block: Block, x: number, y: number, size = 26) => (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={size}
      fontWeight={800}
      fill={palette.ink[9]}
      stroke="white"
      strokeWidth={5}
      paintOrder="stroke"
    >
      {block.rows} × {block.cols}
    </text>
  );

  const inTray = blocks.filter(
    (b) => !b.at && b.id !== (drag?.moved ? drag.id : -1),
  );
  const dragging = drag?.moved
    ? blocks.find((b) => b.id === drag.id)
    : undefined;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex" }}>
      <svg
        ref={svgRef}
        role="img"
        aria-label={`A ${task.rows} by ${task.cols} hole and a tray of array blocks`}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "100%", touchAction: "none" }}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <rect width={W} height={H} fill={palette.sand[1]} />
        {/* The board and the hole */}
        <rect
          x={board.x - 50}
          y={board.y - 50}
          width={board.w + 80}
          height={board.h + 80}
          rx={20}
          fill={palette.sky[1]}
        />
        <rect
          x={holeX}
          y={holeY}
          width={holeW}
          height={holeH}
          fill={palette.ink[8]}
          opacity={cleared ? 0.15 : 1}
        />
        <g stroke={palette.ink[6]}>
          {grid(holeX, holeY, task.rows, task.cols, unit)}
        </g>
        <text
          x={holeX + holeW / 2}
          y={holeY - 14}
          textAnchor="middle"
          fontSize={32}
          fontWeight={800}
          fill={palette.ink[9]}
        >
          {task.cols}
        </text>
        <text
          x={holeX - 14}
          y={holeY + holeH / 2 + 11}
          textAnchor="end"
          fontSize={32}
          fontWeight={800}
          fill={palette.ink[9]}
        >
          {task.rows}
        </text>
        {placed.map((b) =>
          b.at ? (
            <g
              key={b.id}
              onPointerDown={(e) => down(e, b.id)}
              style={{
                cursor: "grab",
                transformOrigin: `${holeX + holeW / 2}px ${holeY + holeH / 2}px`,
                transform: cleared ? "scale(1.04)" : undefined,
                transition: "transform 300ms",
              }}
            >
              {blockShape(
                b,
                holeX + b.at.c * unit,
                holeY + b.at.r * unit,
                unit,
              )}
              {label(
                b,
                holeX + (b.at.c + b.cols / 2) * unit,
                holeY + (b.at.r + b.rows / 2) * unit + 10,
                Math.min(
                  28,
                  Math.max(16, Math.min(b.cols, b.rows * 3) * unit * 0.3),
                ),
              )}
            </g>
          ) : null,
        )}
        {/* A block that didn't fit: drawn where it was dropped, red where it's wrong */}
        {bounce && (
          <g>
            {blockShape(
              bounce.block,
              holeX + bounce.c * unit,
              holeY + bounce.r * unit,
              unit,
              { opacity: 0.85, stroke: palette.ember[6] },
            )}
            <rect
              x={holeX + bounce.c * unit}
              y={holeY + bounce.r * unit}
              width={bounce.block.cols * unit}
              height={bounce.block.rows * unit}
              fill="none"
              stroke={palette.ember[6]}
              strokeWidth={8}
            />
            {/* The part outside the hole */}
            <clipPath id="outside">
              <path
                clipRule="evenodd"
                d={`M0 0H${W}V${H}H0Z M${holeX} ${holeY}h${holeW}v${holeH}h${-holeW}Z`}
              />
            </clipPath>
            <rect
              x={holeX + bounce.c * unit}
              y={holeY + bounce.r * unit}
              width={bounce.block.cols * unit}
              height={bounce.block.rows * unit}
              fill={palette.ember[6]}
              opacity={0.6}
              clipPath="url(#outside)"
            />
          </g>
        )}
        {/* The tray */}
        {!cleared &&
          blocks.map((b, index) => {
            if (!inTray.includes(b)) return null;
            const spot = traySpot(index, b);
            return (
              <g
                key={b.id}
                onPointerDown={(e) => down(e, b.id)}
                style={{ cursor: "grab" }}
              >
                <rect
                  x={tray.x + (index % 2) * tray.slotW + 6}
                  y={spot.top - 4}
                  width={tray.slotW - 12}
                  height={tray.slotH - 12}
                  rx={14}
                  fill={palette.sand[0]}
                  stroke={palette.ink[2]}
                  strokeWidth={2}
                />
                {blockShape(b, spot.x, spot.y, spot.fit)}
                {label(b, spot.cx, spot.top + tray.slotH - 30, 30)}
              </g>
            );
          })}
        {/* The block being dragged, at real size */}
        {dragging && drag && (
          <g pointerEvents="none">
            {blockShape(
              dragging,
              drag.x - (dragging.cols * unit) / 2,
              drag.y - (dragging.rows * unit) / 2,
              unit,
              { opacity: 0.85 },
            )}
            {label(dragging, drag.x, drag.y + 10, 28)}
          </g>
        )}
        {/* The blast: the hole as a sum of its blocks */}
        {cleared && (
          <g>
            <text
              x={1060}
              y={150}
              textAnchor="middle"
              fontSize={34}
              fontWeight={800}
              fill={palette.ink[9]}
            >
              {task.rows} × {task.cols} =
            </text>
            {placed.map((b, i) => (
              <g key={b.id}>
                <rect
                  x={940}
                  y={175 + i * 52}
                  width={240}
                  height={44}
                  rx={10}
                  fill={b.color}
                />
                <text
                  x={1060}
                  y={207 + i * 52}
                  textAnchor="middle"
                  fontSize={28}
                  fontWeight={800}
                  fill={palette.ink[9]}
                >
                  {i > 0 ? "+ " : ""}
                  {b.rows} × {b.cols} = {b.rows * b.cols}
                </text>
              </g>
            ))}
            <text
              x={1060}
              y={225 + placed.length * 52}
              textAnchor="middle"
              fontSize={44}
              fontWeight={900}
              fill={palette.ink[9]}
            >
              = {task.rows * task.cols}
            </text>
          </g>
        )}
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
        {Math.min(round + 1, holesPerRound)} / {holesPerRound}
      </div>
      {cleared && (
        <button
          type="button"
          onClick={done ? again : next}
          style={{
            position: "absolute",
            right: 40,
            bottom: 30,
            minWidth: 180,
            minHeight: 64,
            fontSize: 26,
            fontWeight: 800,
            borderRadius: 16,
            border: "none",
            background: palette.leaf[6],
            color: "white",
          }}
        >
          {done ? "Play again" : "Next hole →"}
        </button>
      )}
    </div>
  );
}
