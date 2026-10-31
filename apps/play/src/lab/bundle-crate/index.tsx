// Bundle Crate: a board of loose base ten blocks and an order ("507, in 12
// blocks"). Drag a chain through ten alike blocks to bundle them into one
// bigger block; hold a block to smash it into ten smaller ones; tap a block to
// put it in the crate. Send the crate and the robot counts it. Rough
// prototype; see ../README.md.
import { palette } from "@repo/tokens";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  title: "Bundle Crate",
  pitch:
    "An order arrives: a number, and how many blocks to send it in. Drag through ten alike blocks to bundle them into one bigger block, hold a block to smash it into ten, and tap blocks into the crate. Send it, and the robot counts what you made.",
  expectations: [
    "math-2020.g3.B1.1",
    "math-2020.g3.B1.5",
    "math-2020.g4.B1.1",
    "math-2020.g5.B1.1",
  ],
  misconceptions: [
    {
      id: "digit-face-value",
      fails:
        "Reading the 5 in 507 as five of the smallest block: the robot counts the crate and shows 57 (or 12) beside the order's 507, the gap plain to see.",
    },
    {
      id: "one-way-to-split",
      fails:
        "Thinking 230 can only be 2 hundreds and 3 tens: the order asks for 14 blocks, and the robot says the number is right but the crate has 5. Smashing a hundred into ten tens is the way through.",
    },
  ],
  sampleTask:
    "math-2020.g3.B1.1, sample task 3: exchanging a flat for 10 rods to show 647 as 5 flats, 14 rods and 7 cubes. Also math-2020.g4.B1.1's 8621 as 7 thousands + 16 hundreds + 2 tens + 1 one, and math-2020.g3.B1.5's 467 where students take away 6 instead of 60.",
  isArchived: true,
  fun: "Two Dots and merge games: drawing a chain through matching pieces and watching them pop into one bigger piece, plus the tidy-up of filling a crate exactly. Each order is a small puzzle with one satisfying send.",
};

const ordersPerRound = 6;
const COLS = 8;
const ROWS = 6;
const CELL = 80;
const board = { x: 30, y: 110 };
const crate = { x: 700, y: 110, w: 570, h: 400 };
const holdMs = 450;

const names = ["one", "ten", "hundred", "thousand", "ten thousand"];
const plural = ["ones", "tens", "hundreds", "thousands", "ten thousands"];
const colors = [
  palette.sunshine[4],
  palette.sky[4],
  palette.leaf[4],
  palette.berry[4],
  palette.ember[3],
];

const fmt = (n: number) =>
  n >= 10000 ? n.toLocaleString("en-CA").replace(/,/g, " ") : String(n);

const rand = (lo: number, hi: number) =>
  lo + Math.floor(Math.random() * (hi - lo + 1));

interface Block {
  id: number;
  kind: number;
}

interface Order {
  target: number;
  count: number;
  board: (Block | null)[];
}

let nextId = 1;

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

function makeOrder(grade: number, round: number): Order {
  const kinds = grade <= 3 ? 3 : grade === 4 ? 4 : 5;
  const smash = round >= 3;
  for (;;) {
    const digits = Array.from({ length: kinds }, (_, k) =>
      k === kinds - 1 ? rand(1, 9) : Math.random() < 0.25 ? 0 : rand(1, 9),
    );
    const target = digits.reduce((sum, d, k) => sum + d * 10 ** k, 0);
    const standard = digits.reduce((a, b) => a + b, 0);
    const supply = [...digits];
    if (smash) {
      // Every block is already the biggest it can be: the order's extra nine
      // blocks only come from smashing one.
    } else {
      // One place is a block short, made up by ten loose smaller ones.
      const places = digits
        .map((d, k) => (k > 0 && d > 0 ? k : -1))
        .filter((k) => k > 0);
      const k = places[rand(0, places.length - 1)] as number;
      supply[k] = (supply[k] as number) - 1;
      supply[k - 1] = (supply[k - 1] as number) + 10;
    }
    // A few spare blocks, so the whole board never goes in.
    for (let i = 0; i < 3; i++) {
      const k = rand(0, kinds - 1);
      supply[k] = (supply[k] as number) + 1;
    }
    const total = supply.reduce((a, b) => a + b, 0);
    if (total > COLS * ROWS - 12) continue;
    const blocks: (Block | null)[] = supply.flatMap((n, kind) =>
      Array.from({ length: n }, () => ({ id: nextId++, kind })),
    );
    while (blocks.length < COLS * ROWS) blocks.push(null);
    return {
      target,
      count: smash ? standard + 9 : standard,
      board: shuffle(blocks),
    };
  }
}

/** A base ten block drawn to fit a square of side s centred on (cx, cy). */
function BlockIcon({
  kind,
  cx,
  cy,
  s,
  glow,
}: {
  kind: number;
  cx: number;
  cy: number;
  s: number;
  glow?: boolean;
}) {
  const fill = colors[kind];
  const stroke = glow ? palette.ink[9] : palette.ink[6];
  const sw = glow ? 4 : 2;
  if (kind === 0) {
    const w = s * 0.32;
    return (
      <rect
        x={cx - w / 2}
        y={cy - w / 2}
        width={w}
        height={w}
        rx={3}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
      />
    );
  }
  if (kind === 1) {
    const w = s * 0.18;
    const h = s * 0.82;
    return (
      <g>
        <rect
          x={cx - w / 2}
          y={cy - h / 2}
          width={w}
          height={h}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
        {Array.from({ length: 9 }, (_, i) => (
          <line
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed segments
            key={i}
            x1={cx - w / 2}
            x2={cx + w / 2}
            y1={cy - h / 2 + ((i + 1) * h) / 10}
            y2={cy - h / 2 + ((i + 1) * h) / 10}
            stroke={palette.ink[5]}
            strokeWidth={1}
          />
        ))}
      </g>
    );
  }
  if (kind === 2) {
    const w = s * 0.78;
    return (
      <g>
        <rect
          x={cx - w / 2}
          y={cy - w / 2}
          width={w}
          height={w}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
        {Array.from({ length: 9 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed grid
          <g key={i} stroke={palette.ink[5]} strokeWidth={0.8}>
            <line
              x1={cx - w / 2 + ((i + 1) * w) / 10}
              x2={cx - w / 2 + ((i + 1) * w) / 10}
              y1={cy - w / 2}
              y2={cy + w / 2}
            />
            <line
              y1={cy - w / 2 + ((i + 1) * w) / 10}
              y2={cy - w / 2 + ((i + 1) * w) / 10}
              x1={cx - w / 2}
              x2={cx + w / 2}
            />
          </g>
        ))}
      </g>
    );
  }
  // A cube in perspective; ten thousands are a row of ten little cubes.
  const cube = (x: number, y: number, w: number, key?: number) => {
    const d = w * 0.3;
    return (
      <g key={key}>
        <polygon
          points={`${x},${y + d} ${x + w},${y + d} ${x + w},${y + w + d} ${x},${y + w + d}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
        />
        <polygon
          points={`${x},${y + d} ${x + d},${y} ${x + w + d},${y} ${x + w},${y + d}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          opacity={0.75}
        />
        <polygon
          points={`${x + w},${y + d} ${x + w + d},${y} ${x + w + d},${y + w} ${x + w},${y + w + d}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          opacity={0.55}
        />
      </g>
    );
  };
  if (kind === 3) {
    const w = s * 0.6;
    return cube(cx - w / 2 - w * 0.15, cy - w / 2 - w * 0.15, w);
  }
  const w = s * 0.12;
  return (
    <g>
      {Array.from({ length: 10 }, (_, i) =>
        cube(cx - w * 0.65, cy + s * 0.4 - (i + 1) * w * 0.78, w, i),
      )}
    </g>
  );
}

type Mood = "thinking" | "happy" | "encouraging" | "cheering";

interface Press {
  cell: number;
  pointer: number;
  chain: number[];
  timer: number;
}

export default function BundleCrate({ grade, Avatar, speak }: PrototypeProps) {
  const kinds = grade <= 3 ? 3 : grade === 4 ? 4 : 5;
  const [round, setRound] = useState(0);
  const [order, setOrder] = useState(() => makeOrder(grade, 0));
  const [cells, setCells] = useState<(Block | null)[]>(order.board);
  const [inCrate, setInCrate] = useState<Block[]>([]);
  const [press, setPress] = useState<Press | null>(null);
  const [pop, setPop] = useState<number | null>(null);
  const [result, setResult] = useState<{
    made: number;
    count: number;
    ok: boolean;
  } | null>(null);
  const [mood, setMood] = useState<Mood>("thinking");
  const svgRef = useRef<SVGSVGElement>(null);
  const pressRef = useRef<Press | null>(null);
  pressRef.current = press;
  const cellsRef = useRef(cells);
  cellsRef.current = cells;

  const done = result?.ok && round >= ordersPerRound - 1;

  useEffect(() => {
    setCells(order.board);
    setInCrate([]);
    setResult(null);
    speak(
      round === 0
        ? `Make ${order.target}, in ${order.count} blocks. Drag through ten blocks that match to bundle them. Hold a block to smash it. Tap blocks to put them in the crate.`
        : `Make ${order.target}, in ${order.count} blocks.`,
    );
  }, [order, round, speak]);

  const point = (event: { clientX: number; clientY: number }) => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return { x: -1, y: -1 };
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
    return { x: p.x, y: p.y };
  };

  const cellAt = (x: number, y: number) => {
    const c = Math.floor((x - board.x) / CELL);
    const r = Math.floor((y - board.y) / CELL);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return -1;
    // Only count the middle of a cell, so diagonals are easy to draw.
    const fx = (x - board.x) / CELL - c;
    const fy = (y - board.y) / CELL - r;
    if (fx < 0.15 || fx > 0.85 || fy < 0.15 || fy > 0.85) return -1;
    return r * COLS + c;
  };

  const smash = (cell: number) => {
    const all = cellsRef.current;
    const block = all[cell];
    if (!block || block.kind === 0) return;
    const free = all
      .map((b, i) => (b ? -1 : i))
      .filter((i) => i >= 0)
      .sort(
        (a, b) =>
          Math.hypot(
            (a % COLS) - (cell % COLS),
            Math.floor(a / COLS) - Math.floor(cell / COLS),
          ) -
          Math.hypot(
            (b % COLS) - (cell % COLS),
            Math.floor(b / COLS) - Math.floor(cell / COLS),
          ),
      );
    if (free.length < 9) {
      setMood("encouraging");
      speak("No room to smash it. Put some blocks in the crate first.");
      return;
    }
    const next = [...all];
    const kind = block.kind - 1;
    next[cell] = { id: nextId++, kind };
    for (const i of free.slice(0, 9)) next[i] = { id: nextId++, kind };
    setCells(next);
    setPop(cell);
    setTimeout(() => setPop(null), 400);
    speak(`One ${names[block.kind]} makes ten ${plural[kind]}.`);
  };

  const down = (event: PointerEvent<SVGSVGElement>) => {
    if (result?.ok) return;
    const { x, y } = point(event);
    const cell = cellAt(x, y);
    if (cell < 0 || !cells[cell]) return;
    svgRef.current?.setPointerCapture(event.pointerId);
    const timer = window.setTimeout(() => {
      const current = pressRef.current;
      if (current && current.chain.length === 1) {
        setPress(null);
        smash(current.cell);
      }
    }, holdMs);
    setPress({ cell, pointer: event.pointerId, chain: [cell], timer });
  };

  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!press) return;
    const { x, y } = point(event);
    const cell = cellAt(x, y);
    if (cell < 0) return;
    const chain = press.chain;
    const last = chain[chain.length - 1] as number;
    if (cell === last) return;
    const kind = cells[press.cell]?.kind;
    const block = cells[cell];
    if (
      block &&
      block.kind === kind &&
      !chain.includes(cell) &&
      chain.length < 10
    ) {
      window.clearTimeout(press.timer);
      setPress({ ...press, chain: [...chain, cell] });
    }
  };

  const up = () => {
    if (!press) return;
    window.clearTimeout(press.timer);
    const { chain } = press;
    setPress(null);
    const first = cells[chain[0] as number];
    if (!first) return;
    if (chain.length === 1) {
      // A tap: into the crate.
      const same = inCrate.filter((b) => b.kind === first.kind).length;
      if (same >= 19) {
        speak("That part of the crate is full.");
        return;
      }
      setCells(cells.map((b, i) => (i === chain[0] ? null : b)));
      setInCrate([...inCrate, first]);
      setResult(null);
      return;
    }
    if (chain.length < 10) {
      speak(`That's ${chain.length}. A bundle takes ten.`);
      return;
    }
    if (first.kind + 1 >= kinds) {
      speak(`Ten ${plural[first.kind]} is as big as this order goes.`);
      return;
    }
    const at = chain[chain.length - 1] as number;
    const next = cells.map((b, i) => (chain.includes(i) ? null : b));
    next[at] = { id: nextId++, kind: first.kind + 1 };
    setCells(next);
    setPop(at);
    setTimeout(() => setPop(null), 400);
    setMood("happy");
    speak(`Ten ${plural[first.kind]} make one ${names[first.kind + 1]}!`);
  };

  const takeBack = (block: Block) => {
    if (result?.ok) return;
    const free = cells.indexOf(null);
    if (free < 0) return;
    setCells(cells.map((b, i) => (i === free ? block : b)));
    setInCrate(inCrate.filter((b) => b.id !== block.id));
    setResult(null);
  };

  const send = () => {
    const made = inCrate.reduce((sum, b) => sum + 10 ** b.kind, 0);
    const count = inCrate.length;
    const ok = made === order.target && count === order.count;
    setResult({ made, count, ok });
    if (ok) {
      setMood("cheering");
      speak(
        round >= ordersPerRound - 1
          ? `${fmt(made)} in ${count} blocks. Every order is done!`
          : `${fmt(made)} in ${count} blocks. Order sent!`,
      );
    } else if (made !== order.target) {
      setMood("encouraging");
      speak(`The robot counted ${made}. The order is ${order.target}.`);
    } else {
      setMood("encouraging");
      speak(
        `Right number! But that's ${count} blocks. The order wants ${order.count}.`,
      );
    }
  };

  const next = () => {
    const r = done ? 0 : round + 1;
    setRound(r);
    setMood("thinking");
    setOrder(makeOrder(grade, r));
  };

  const chain = press?.chain ?? [];
  const chainEnd = chain[chain.length - 1];
  const colW = crate.w / kinds;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        // Fit the stage below the lab bar, by height as well as width.
        maxWidth: "min(1300px, calc((100dvh - 76px) * 13 / 6))",
        margin: "0 auto",
      }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 1300 600"
        style={{ width: "100%", touchAction: "none", userSelect: "none" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onContextMenu={(e) => e.preventDefault()}
        role="img"
        aria-label="A board of base ten blocks and a crate"
      >
        {/* The order */}
        <rect
          x={110}
          y={14}
          width={430}
          height={82}
          rx={14}
          fill={palette.sand[0]}
          stroke={palette.ink[6]}
          strokeWidth={3}
        />
        <text
          x={130}
          y={74}
          fontSize={52}
          fontWeight={900}
          fill={palette.ink[9]}
        >
          {fmt(order.target)}
        </text>
        <text
          x={528}
          y={66}
          textAnchor="end"
          fontSize={26}
          fontWeight={700}
          fill={palette.ink[7]}
        >
          in {order.count} blocks
        </text>
        <text
          x={560}
          y={40}
          fontSize={20}
          fontWeight={700}
          fill={palette.ink[6]}
        >
          {Math.min(round + 1, ordersPerRound)} / {ordersPerRound}
        </text>
        {result && (
          <g>
            <text
              x={560}
              y={80}
              fontSize={28}
              fontWeight={800}
              fill={result.ok ? palette.leaf[7] : palette.ember[7]}
            >
              {result.ok
                ? "Order sent!"
                : result.made !== order.target
                  ? `Robot counted ${fmt(result.made)}`
                  : `Right number, but ${result.count} blocks`}
            </text>
          </g>
        )}

        {/* The board */}
        <rect
          x={board.x - 6}
          y={board.y - 6}
          width={COLS * CELL + 12}
          height={ROWS * CELL + 12}
          rx={12}
          fill={palette.slate[0]}
          stroke={palette.slate[3]}
          strokeWidth={2}
        />
        {cells.map((block, i) => {
          const cx = board.x + (i % COLS) * CELL + CELL / 2;
          const cy = board.y + Math.floor(i / COLS) * CELL + CELL / 2;
          const inChain = chain.includes(i);
          return (
            <g
              key={block?.id ?? `e${i}`}
              data-cell={i}
              data-kind={block?.kind ?? ""}
            >
              {inChain && (
                <circle cx={cx} cy={cy} r={CELL * 0.46} fill={palette.sky[1]} />
              )}
              {pop === i && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={CELL * 0.5}
                  fill={palette.sunshine[2]}
                />
              )}
              {block && (
                <BlockIcon
                  kind={block.kind}
                  cx={cx}
                  cy={cy}
                  s={CELL}
                  glow={inChain}
                />
              )}
            </g>
          );
        })}
        {chain.length > 1 && (
          <g pointerEvents="none">
            <polyline
              points={chain
                .map(
                  (i) =>
                    `${board.x + (i % COLS) * CELL + CELL / 2},${board.y + Math.floor(i / COLS) * CELL + CELL / 2}`,
                )
                .join(" ")}
              fill="none"
              stroke={palette.sky[6]}
              strokeWidth={8}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.6}
            />
            {chainEnd !== undefined && (
              <g>
                <circle
                  cx={board.x + (chainEnd % COLS) * CELL + CELL * 0.85}
                  cy={
                    board.y + Math.floor(chainEnd / COLS) * CELL + CELL * 0.15
                  }
                  r={24}
                  fill={chain.length === 10 ? palette.leaf[6] : palette.ink[8]}
                />
                <text
                  x={board.x + (chainEnd % COLS) * CELL + CELL * 0.85}
                  y={
                    board.y +
                    Math.floor(chainEnd / COLS) * CELL +
                    CELL * 0.15 +
                    9
                  }
                  textAnchor="middle"
                  fontSize={24}
                  fontWeight={900}
                  fill="white"
                >
                  {chain.length}
                </text>
              </g>
            )}
          </g>
        )}

        {/* The crate: one column per kind, biggest on the left */}
        <rect
          x={crate.x}
          y={crate.y}
          width={crate.w}
          height={crate.h}
          rx={14}
          fill={palette.sand[1]}
          stroke={palette.sand[6]}
          strokeWidth={4}
        />
        {Array.from({ length: kinds }, (_, i) => {
          const kind = kinds - 1 - i;
          const x = crate.x + i * colW;
          const here = inCrate.filter((b) => b.kind === kind);
          const slot = 40;
          return (
            <g key={kind}>
              {i > 0 && (
                <line
                  x1={x}
                  x2={x}
                  y1={crate.y + 10}
                  y2={crate.y + crate.h - 10}
                  stroke={palette.sand[5]}
                  strokeWidth={2}
                />
              )}
              <BlockIcon
                kind={kind}
                cx={x + colW / 2}
                cy={crate.y + 36}
                s={44}
              />
              {/* Tapping anywhere in a column takes one of its blocks back. */}
              <rect
                x={x}
                y={crate.y}
                width={colW}
                height={crate.h}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const last = here[here.length - 1];
                  if (last) takeBack(last);
                }}
              />
              {here.map((b, j) => {
                const col = j % 2;
                const row = Math.floor(j / 2);
                const cx = x + colW / 2 + (col - 0.5) * slot * 1.1;
                const cy = crate.y + 84 + row * (slot - 8);
                return (
                  <BlockIcon key={b.id} kind={kind} cx={cx} cy={cy} s={slot} />
                );
              })}
              <text
                x={x + colW / 2}
                y={crate.y + crate.h + 40}
                textAnchor="middle"
                fontSize={36}
                fontWeight={900}
                fill={palette.ink[9]}
              >
                {here.length}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", left: 12, top: 4 }}>
        <Avatar expression={done ? "cheering" : mood} size={84} />
      </div>
      <button
        type="button"
        onClick={result?.ok ? next : send}
        disabled={!result?.ok && inCrate.length === 0}
        style={{
          position: "absolute",
          right: "2%",
          top: "1%",
          minWidth: 200,
          minHeight: 64,
          fontSize: 26,
          fontWeight: 800,
          borderRadius: 16,
          border: "none",
          background: result?.ok ? palette.leaf[6] : palette.sky[6],
          color: "white",
          opacity: !result?.ok && inCrate.length === 0 ? 0.5 : 1,
        }}
      >
        {result?.ok ? (done ? "Play again" : "Next order →") : "Send crate"}
      </button>
    </div>
  );
}
