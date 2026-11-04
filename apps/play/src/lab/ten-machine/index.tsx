// Ten Machine: plan, then watch. An order ("Make 160, using only tens") and a
// machine with a tube per place. Set how many blocks each open chute drops,
// then run it: blocks fall into their tubes, and every tenth block fuses the
// ten into one bigger block that flies into the next tube, in chain
// reactions. The tubes' windows read the number made. Rough prototype; see
// ../README.md.
import { palette } from "@repo/tokens";
import { useEffect, useRef, useState } from "react";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  title: "Ten Machine",
  pitch:
    'Make a number with some chutes closed ("Make 160, using only tens"). Set how many blocks each open chute drops, then run the machine and watch every ten fuse into one bigger block, in chain reactions, until the windows read your number.',
  expectations: [
    "math-2020.g3.B1.1",
    "math-2020.g3.B1.5",
    "math-2020.g4.B1.1",
    "math-2020.g5.B1.1",
  ],
  misconceptions: [
    {
      id: "copies-the-digit",
      fails:
        "For 160 using only tens, dropping 6 tens because the tens digit is 6: the windows read 60, under the order's 1 6 0, with the hundreds window empty.",
    },
    {
      id: "whole-number-as-count",
      fails:
        "For 160 using only tens, dropping 160 tens: the machine keeps fusing, a thousand lights up, and the windows read 1600, a whole place too far left.",
    },
  ],
  sampleTask:
    "math-2020.g5.B1.1's example of 10 620 as 106 hundreds and 20 ones, math-2020.g4.B1.1's 8621 as 7 thousands + 16 hundreds + 2 tens + 1 one, and math-2020.g3.B1.1, sample task 2's clue \"my number has 16 tens and 16 ones\".",
  fun: "Fraction Hop's plan-then-watch loop with a chain-reaction payoff, like 2048 merges or a Rube Goldberg machine: you set it up, press go, and the fusing cascades. 999 + 1 sets off every tube at once.",
  isArchived: true,
};

const ordersPerRound = 6;
const maxCount = 199;
const slots = 9;
const names = [
  "ones",
  "tens",
  "hundreds",
  "thousands",
  "ten thousands",
  "hundred thousands",
];
const colors = [
  palette.sunshine[4],
  palette.sky[4],
  palette.leaf[4],
  palette.berry[4],
  palette.ember[3],
  palette.teal[4],
];

const rand = (lo: number, hi: number) =>
  lo + Math.floor(Math.random() * (hi - lo + 1));

const fmt = (n: number) =>
  n >= 10000 ? n.toLocaleString("en-CA").replace(/,/g, " ") : String(n);

interface Order {
  target: number;
  /** Which places' chutes are open. */
  open: boolean[];
}

function makeOrder(grade: number, round: number): Order {
  const kinds = grade <= 3 ? 3 : grade === 4 ? 4 : 5;
  const digits = Array.from({ length: kinds }, (_, k) =>
    k === kinds - 1 ? rand(1, 9) : Math.random() < 0.25 ? 0 : rand(1, 9),
  );
  const target = digits.reduce((sum, d, k) => sum + d * 10 ** k, 0);
  const open = Array.from({ length: kinds }, () => true);
  if (round >= 2) {
    // Close the top chute, or later one in the middle, so the count needed
    // in some chute is ten or more (never past maxCount).
    const closed = round >= 4 && kinds > 3 ? kinds - 2 : kinds - 1;
    open[closed] = false;
  }
  // The extra tube on the left is never open: it only catches fusing.
  open.push(false);
  return { target, open };
}

function namesOpen(order: Order): string[] {
  return order.open
    .map((o, k) => (o ? names[k] : undefined))
    .filter((n): n is string => !!n)
    .reverse();
}

function orderLine(order: Order): string {
  const allOpen = order.open.slice(0, -1).every(Boolean);
  return `Make ${order.target}${allOpen ? "." : `, using only ${namesOpen(order).join(" and ")}.`}`;
}

type Event = { kind: "drop" | "fuse"; place: number };
type Mood = "thinking" | "happy" | "encouraging" | "cheering";

export default function TenMachine({ grade, Avatar, speak }: PrototypeProps) {
  const [round, setRound] = useState(0);
  const [order, setOrder] = useState(() => makeOrder(grade, 0));
  const tubesN = order.open.length;
  const [plan, setPlan] = useState<number[]>(() => Array(tubesN).fill(0));
  const [tubes, setTubes] = useState<number[]>(() => Array(tubesN).fill(0));
  const [flash, setFlash] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ made: number; ok: boolean } | null>(
    null,
  );
  const [mood, setMood] = useState<Mood>("thinking");
  const timer = useRef<number | undefined>(undefined);
  const done = result?.ok && round >= ordersPerRound - 1;

  const openNames = namesOpen(order);
  const allOpen = order.open.slice(0, -1).every(Boolean);

  useEffect(() => {
    setPlan(Array(order.open.length).fill(0));
    setTubes(Array(order.open.length).fill(0));
    setResult(null);
    const line = orderLine(order);
    speak(
      round === 0
        ? `${line} Set how many blocks each chute drops, then press Run.`
        : line,
    );
  }, [order, round, speak]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const change = (place: number, by: number) => {
    if (running || result?.ok) return;
    setPlan((p) =>
      p.map((n, k) =>
        k === place ? Math.max(0, Math.min(maxCount, n + by)) : n,
      ),
    );
    setTubes(Array(tubesN).fill(0));
    setResult(null);
    setMood("thinking");
  };

  const run = () => {
    const drops = plan.reduce((a, b) => a + b, 0);
    if (drops === 0 || running) return;
    setRunning(true);
    setResult(null);
    // Biggest blocks first, so the small ones' fusing cascades up through
    // tubes that are already filling.
    const queue: Event[] = [];
    for (let k = tubesN - 1; k >= 0; k--)
      for (let i = 0; i < (plan[k] ?? 0); i++)
        queue.push({ kind: "drop", place: k });
    const pace = Math.max(35, Math.min(220, 2600 / drops));
    const state = Array(tubesN).fill(0) as number[];
    setTubes([...state]);
    const step = () => {
      const event = queue.shift();
      if (!event) {
        const made = state.reduce((sum, n, k) => sum + n * 10 ** k, 0);
        const ok = made === order.target;
        setRunning(false);
        setFlash(null);
        setResult({ made, ok });
        setMood(ok ? "cheering" : "encouraging");
        speak(
          ok
            ? round >= ordersPerRound - 1
              ? `${made}! Every order is done!`
              : `${made}! Order made!`
            : `The machine made ${made}. The order is ${order.target}.`,
        );
        return;
      }
      const k = event.place;
      state[k] = (state[k] ?? 0) + 1;
      // The top tube can't fuse further; it just keeps counting.
      if ((state[k] as number) >= 10 && k < tubesN - 1) {
        state[k] = 0;
        queue.unshift({ kind: "fuse", place: k + 1 });
        setFlash(k);
      } else if (event.kind === "fuse") {
        setFlash(k);
      }
      setTubes([...state]);
      timer.current = window.setTimeout(
        step,
        event.kind === "fuse" ? Math.max(pace, 160) : pace,
      );
    };
    timer.current = window.setTimeout(step, 200);
  };

  const next = () => {
    const r = done ? 0 : round + 1;
    setRound(r);
    setMood("thinking");
    setOrder(makeOrder(grade, r));
  };

  const targetDigits = String(order.target).split("").reverse();
  const madeDigits = tubes;
  const colW = Math.min(210, 1240 / tubesN);
  const left = (1300 - colW * tubesN) / 2;
  const tube = { y: 322, h: 210, w: 74 };
  const slotH = tube.h / slots;

  const btn = (
    label: string,
    place: number,
    by: number,
    x: number,
    y: number,
  ) => (
    <button
      key={label}
      type="button"
      onClick={() => change(place, by)}
      disabled={running || !!result?.ok}
      style={{
        position: "absolute",
        left: `${(x / 1300) * 100}%`,
        top: `${(y / 600) * 100}%`,
        width: `${(60 / 1300) * 100}%`,
        minWidth: 52,
        minHeight: 52,
        fontSize: 22,
        fontWeight: 800,
        borderRadius: 12,
        border: `2px solid ${palette.ink[5]}`,
        background: palette.sand[0],
        color: palette.ink[9],
        transform: "translateX(-50%)",
      }}
    >
      {label}
    </button>
  );

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
        viewBox="0 0 1300 600"
        style={{ width: "100%", userSelect: "none" }}
        role="img"
        aria-label="A machine with a tube for each place"
      >
        {/* The order */}
        <rect
          x={110}
          y={12}
          width={520}
          height={80}
          rx={14}
          fill={palette.sand[0]}
          stroke={palette.ink[6]}
          strokeWidth={3}
        />
        <text
          x={130}
          y={70}
          fontSize={50}
          fontWeight={900}
          fill={palette.ink[9]}
        >
          {fmt(order.target)}
        </text>
        <text
          x={615}
          y={64}
          textAnchor="end"
          fontSize={24}
          fontWeight={700}
          fill={palette.ink[7]}
        >
          {allOpen ? "any blocks" : `only ${openNames.join(" + ")}`}
        </text>
        <text
          x={660}
          y={40}
          fontSize={20}
          fontWeight={700}
          fill={palette.ink[6]}
        >
          {Math.min(round + 1, ordersPerRound)} / {ordersPerRound}
        </text>
        {result && (
          <text
            x={660}
            y={80}
            fontSize={28}
            fontWeight={800}
            fill={result.ok ? palette.leaf[7] : palette.ember[7]}
          >
            {result.ok ? "Order made!" : `Made ${fmt(result.made)}`}
          </text>
        )}

        {order.open.map((isOpen, i) => {
          const k = i;
          const col = tubesN - 1 - k;
          const cx = left + col * colW + colW / 2;
          const count = madeDigits[k] ?? 0;
          const shown = Math.min(count, slots);
          return (
            <g key={k}>
              {/* Chute and plan */}
              <rect
                x={cx - colW / 2 + 8}
                y={108}
                width={colW - 16}
                height={200}
                rx={12}
                fill={isOpen ? palette.slate[0] : palette.slate[2]}
                stroke={isOpen ? colors[k] : palette.slate[3]}
                strokeWidth={4}
              />
              <text
                x={cx}
                y={134}
                textAnchor="middle"
                fontSize={18}
                fontWeight={800}
                fill={palette.ink[7]}
              >
                {names[k]}
              </text>
              {isOpen ? (
                <text
                  x={cx}
                  y={180}
                  textAnchor="middle"
                  fontSize={44}
                  fontWeight={900}
                  fill={palette.ink[9]}
                >
                  {plan[k]}
                </text>
              ) : (
                <text
                  x={cx}
                  y={200}
                  textAnchor="middle"
                  fontSize={22}
                  fontWeight={800}
                  fill={palette.slate[6]}
                >
                  closed
                </text>
              )}
              {/* Tube */}
              <rect
                x={cx - tube.w / 2}
                y={tube.y}
                width={tube.w}
                height={tube.h}
                rx={10}
                fill={flash === k ? palette.sunshine[1] : "white"}
                stroke={flash === k ? palette.sunshine[6] : palette.ink[5]}
                strokeWidth={flash === k ? 6 : 3}
              />
              {Array.from({ length: shown }, (_, j) => (
                <rect
                  // biome-ignore lint/suspicious/noArrayIndexKey: slots
                  key={j}
                  x={cx - tube.w / 2 + 6}
                  y={tube.y + tube.h - (j + 1) * slotH + 2}
                  width={tube.w - 12}
                  height={slotH - 4}
                  rx={4}
                  fill={colors[k]}
                  stroke={palette.ink[6]}
                  strokeWidth={1.5}
                />
              ))}
              {/* Window: the digit made, red where it differs from the order's */}
              <rect
                x={cx - 34}
                y={540}
                width={68}
                height={56}
                rx={8}
                fill={palette.ink[9]}
              />
              <text
                x={cx}
                y={583}
                textAnchor="middle"
                fontSize={count > 9 ? 30 : 42}
                fontWeight={900}
                fill={
                  result &&
                  !result.ok &&
                  String(count) !== (targetDigits[k] ?? "0")
                    ? palette.ember[3]
                    : palette.sunshine[2]
                }
              >
                {count}
              </text>
            </g>
          );
        })}
      </svg>
      {order.open.map((isOpen, k) => {
        if (!isOpen) return null;
        const col = tubesN - 1 - k;
        const cx = left + col * colW + colW / 2;
        return [
          btn("−1", k, -1, cx - 34, 186),
          btn("+1", k, 1, cx + 34, 186),
          btn("−10", k, -10, cx - 34, 248),
          btn("+10", k, 10, cx + 34, 248),
        ].map((b, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed buttons
          <span key={`${k}-${i}`}>{b}</span>
        ));
      })}
      <div style={{ position: "absolute", left: 12, top: 4 }}>
        <Avatar expression={done ? "cheering" : mood} size={84} />
      </div>
      <button
        type="button"
        onClick={result?.ok ? next : run}
        disabled={running || (!result?.ok && plan.every((n) => n === 0))}
        style={{
          position: "absolute",
          right: "2%",
          top: "1%",
          minWidth: 180,
          minHeight: 64,
          fontSize: 26,
          fontWeight: 800,
          borderRadius: 16,
          border: "none",
          background: result?.ok ? palette.leaf[6] : palette.sky[6],
          color: "white",
          opacity:
            running || (!result?.ok && plan.every((n) => n === 0)) ? 0.5 : 1,
        }}
      >
        {result?.ok
          ? done
            ? "Play again"
            : "Next order →"
          : running
            ? "Running…"
            : "Run ▶"}
      </button>
    </div>
  );
}
