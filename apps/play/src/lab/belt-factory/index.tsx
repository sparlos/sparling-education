// Belt Factory: plan, then watch. Hoppers of parts along the top, two order
// bins at the bottom, and a lever under each hopper that sends its belt to
// one bin or the other. Set every lever, run the belts, and watch the bins
// fill: each must end up exactly full. Rough prototype; see ../README.md.
import { palette } from "@repo/tokens";
import { useEffect, useRef, useState } from "react";
import {
  amount,
  BigButton,
  fmt,
  type Kind,
  kindFor,
  Stage,
  wait,
} from "../add-sub-kit.tsx";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  title: "Belt Factory",
  isArchived: true,
  pitch:
    "Hoppers of parts (348, 275, 129, 561…) feed belts into two order bins, each needing an exact amount. Flip the lever under each hopper to send it to one bin or the other, then run the belts and watch the bins fill: exactly full, short, or spilling over.",
  expectations: ["math-2020.g3.B2.5", "math-2020.g4.B2.4", "math-2020.g5.B2.4"],
  misconceptions: [
    {
      id: "drops-the-regrouped-ten",
      fails:
        'Every job has a decoy hopper that makes the blue bin\'s amount if you add without carrying (348 + 185 "= 423" for a bin that needs 423, really 348 + 75). Sending those two: the bin spills over, showing 533 against its 423, and the yellow bin comes up short.',
    },
    {
      id: "longer-decimal-is-bigger",
      fails:
        "At Grades 4 and 5, treating 0.35 as more than 2.4 because it has more digits: the hoppers get sent to the wrong bins, and one overflows while the other sits half empty.",
    },
  ],
  sampleTask:
    "math-2020.g3.B2.5's combine situations (589 and 346 make 935; the unknown part of 600), math-2020.g4.B2.4's combining 3.4 and 5.8, and math-2020.g5.B2.4's sample task of estimating, then working out, the total of items from a flyer.",
  fun: "Factorio and Minecraft redstone's loop: wire up the levers, run it, and watch parts stream down the belts. It's a puzzle (which hoppers make each order?), and the near miss is visible as a bin that overflows or comes up short.",
};

const jobsPerRound = 6;
type Bin = "A" | "B";
type Mood = "thinking" | "happy" | "encouraging" | "cheering";

interface Job {
  kind: Kind;
  hoppers: number[];
  need: Record<Bin, number>;
}

/** The number that adds to `a` to make `t` if you never carry: digit by digit. */
function noCarryPartner(a: number, t: number): number {
  let x = 0;
  for (let p = 1, ai = a, ti = t; ti > 0 || ai > 0; p *= 10) {
    x += (((ti % 10) - (ai % 10) + 10) % 10) * p;
    ai = Math.floor(ai / 10);
    ti = Math.floor(ti / 10);
  }
  return x;
}

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

function makeJob(grade: number, round: number): Job {
  const kind = kindFor(grade, round);
  const n = grade <= 3 ? 4 : 5;
  const M = kind.max;
  for (;;) {
    const a = amount(kind, M * 0.12, M * 0.3);
    const b = amount(kind, M * 0.12, M * 0.3);
    if (!a || !b) continue;
    const t = a + b;
    // The decoy: what a student who drops carried tens would pair with a.
    const x = noCarryPartner(a, t);
    if (x === b || x < M * 0.04 || x > M * 0.35) continue;
    const rest = Array.from({ length: n - 3 }, () =>
      amount(kind, M * 0.05, M * 0.25),
    );
    if (rest.some((r) => !r)) continue;
    const hoppers = shuffle([a, b, x, ...(rest as number[])]);
    const total = hoppers.reduce((s, h) => s + h, 0);
    if (total > M) continue;
    // Exactly one way to fill the blue bin.
    let ways = 0;
    for (let mask = 1; mask < 1 << n; mask++) {
      let sum = 0;
      for (let i = 0; i < n; i++) if (mask & (1 << i)) sum += hoppers[i] ?? 0;
      if (sum === t) ways++;
    }
    if (ways !== 1) continue;
    return { kind, hoppers, need: { A: t, B: total - t } };
  }
}

const binX: Record<Bin, number> = { A: 330, B: 970 };
const binColor: Record<Bin, string> = {
  A: palette.sky[5],
  B: palette.sunshine[4],
};
const binName: Record<Bin, string> = { A: "blue", B: "yellow" };
const binTop = 300;
const binH = 150;
const binW = 300;
const leverY = 160;

export default function BeltFactory({ grade, Avatar, speak }: PrototypeProps) {
  const [round, setRound] = useState(0);
  const [job, setJob] = useState(() => makeJob(grade, 0));
  const n = job.hoppers.length;
  const [route, setRoute] = useState<(Bin | null)[]>(() => Array(n).fill(null));
  const [got, setGot] = useState<Record<Bin, number>>({ A: 0, B: 0 });
  const [flow, setFlow] = useState<{ i: number; p: number } | null>(null);
  const [result, setResult] = useState<Record<Bin, boolean> | null>(null);
  const [running, setRunning] = useState(false);
  const [mood, setMood] = useState<Mood>("thinking");
  const alive = useRef(true);
  const dp = job.kind.dp;
  const solved = !!result && result.A && result.B;
  const done = solved && round >= jobsPerRound - 1;
  const xs = job.hoppers.map((_, i) => 150 + (i * 1000) / (n - 1));

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    setRoute(Array(job.hoppers.length).fill(null));
    setGot({ A: 0, B: 0 });
    setResult(null);
    setFlow(null);
    const line = `The blue bin needs ${fmt(job.need.A, job.kind.dp)}. The yellow bin needs ${fmt(job.need.B, job.kind.dp)}.`;
    speak(
      round === 0
        ? `${line} Tap each lever to send its hopper to a bin, then press Run.`
        : line,
    );
  }, [job, round, speak]);

  const flip = (i: number) => {
    if (running || solved) return;
    setRoute((r) => r.map((b, k) => (k === i ? (b === "A" ? "B" : "A") : b)));
    setGot({ A: 0, B: 0 });
    setResult(null);
    setMood("thinking");
  };

  const run = async () => {
    if (running || route.some((b) => !b)) return;
    setRunning(true);
    setResult(null);
    const sum = { A: 0, B: 0 };
    setGot({ ...sum });
    for (let i = 0; i < n; i++) {
      const bin = route[i] as Bin;
      const h = job.hoppers[i] ?? 0;
      const before = sum[bin];
      for (let k = 1; k <= 18; k++) {
        const p = k / 18;
        setFlow({ i, p });
        setGot((g) => ({ ...g, [bin]: before + Math.round(h * p) }));
        await wait(45);
        if (!alive.current) return;
      }
      sum[bin] = before + h;
    }
    setFlow(null);
    setRunning(false);
    const res = { A: sum.A === job.need.A, B: sum.B === job.need.B };
    setResult(res);
    const ok = res.A && res.B;
    setMood(ok ? "cheering" : "encouraging");
    speak(
      ok
        ? round >= jobsPerRound - 1
          ? "Both bins are exactly full! Every order is done!"
          : "Both bins are exactly full!"
        : (["A", "B"] as const)
            .filter((b) => !res[b])
            .map(
              (b) =>
                `The ${binName[b]} bin got ${fmt(sum[b], dp)}. It needs ${fmt(job.need[b], dp)}.`,
            )
            .join(" "),
    );
  };

  const next = () => {
    const r = done ? 0 : round + 1;
    setRound(r);
    setMood("thinking");
    setJob(makeJob(grade, r));
  };

  const beltEnd = (i: number, bin: Bin) => ({
    x: binX[bin] + (i - (n - 1) / 2) * 34,
    y: binTop,
  });

  const scene = (
    <svg
      viewBox="0 0 1300 470"
      style={{ width: "100%", height: "100%", userSelect: "none" }}
      role="img"
      aria-label="Hoppers feeding belts into two bins"
    >
      {/* Belts */}
      {job.hoppers.map((h, i) => {
        const x = xs[i] ?? 0;
        const bin = route[i];
        const ends = bin ? [bin] : (["A", "B"] as const);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: hoppers are fixed per job
          <g key={`${i}-${h}`}>
            {ends.map((b) => {
              const e = beltEnd(i, b);
              return (
                <line
                  key={b}
                  x1={x}
                  y1={leverY + 30}
                  x2={e.x}
                  y2={e.y}
                  stroke={bin ? palette.ink[6] : palette.slate[3]}
                  strokeWidth={bin ? 12 : 4}
                  strokeDasharray={bin ? "14 8" : "6 8"}
                  strokeLinecap="round"
                />
              );
            })}
            {flow?.i === i &&
              bin &&
              Array.from({ length: 6 }, (_, k) => {
                const e = beltEnd(i, bin);
                const t = (flow.p * 3 + k / 6) % 1;
                return (
                  <rect
                    // biome-ignore lint/suspicious/noArrayIndexKey: moving parts
                    key={k}
                    x={x + (e.x - x) * t - 9}
                    y={leverY + 30 + (e.y - leverY - 30) * t - 9}
                    width={18}
                    height={18}
                    rx={3}
                    fill={palette.berry[5]}
                    stroke={palette.ink[8]}
                    strokeWidth={2}
                  />
                );
              })}
          </g>
        );
      })}
      {/* Hoppers */}
      {job.hoppers.map((h, i) => {
        const x = xs[i] ?? 0;
        const emptied = flow ? i < flow.i : !!result;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: hoppers are fixed per job
          <g key={`hopper-${i}-${h}`} opacity={emptied ? 0.45 : 1}>
            <path
              d={`M ${x - 80} 8 h 160 l -40 84 h -80 z`}
              fill="white"
              stroke={palette.ink[7]}
              strokeWidth={4}
            />
            <text
              x={x}
              y={60}
              textAnchor="middle"
              fontSize={fmt(h, dp).length > 5 ? 30 : 36}
              fontWeight={900}
              fill={palette.ink[9]}
            >
              {fmt(h, dp)}
            </text>
            <line
              x1={x}
              x2={x}
              y1={92}
              y2={leverY - 34}
              stroke={palette.ink[6]}
              strokeWidth={10}
            />
          </g>
        );
      })}
      {/* Bins */}
      {(["A", "B"] as const).map((b) => {
        const fill = Math.min(1.2, got[b] / job.need[b]);
        const over = got[b] > job.need[b];
        const r = result?.[b];
        return (
          <g key={b}>
            <rect
              x={binX[b] - binW / 2}
              y={binTop + binH * (1 - Math.min(1, fill))}
              width={binW}
              height={binH * Math.min(1, fill)}
              fill={binColor[b]}
              opacity={0.55}
            />
            {over && (
              <rect
                x={binX[b] - binW / 2 - 10}
                y={binTop - binH * (fill - 1)}
                width={binW + 20}
                height={binH * (fill - 1)}
                rx={8}
                fill={palette.ember[4]}
              />
            )}
            <rect
              x={binX[b] - binW / 2}
              y={binTop}
              width={binW}
              height={binH}
              rx={10}
              fill="none"
              stroke={
                r === undefined
                  ? binColor[b]
                  : r
                    ? palette.leaf[6]
                    : palette.ember[6]
              }
              strokeWidth={r === undefined ? 6 : 9}
            />
            <text
              x={binX[b]}
              y={binTop + 50}
              textAnchor="middle"
              fontSize={24}
              fontWeight={800}
              fill={palette.ink[8]}
            >
              needs {fmt(job.need[b], dp)}
            </text>
            <text
              x={binX[b]}
              y={binTop + 112}
              textAnchor="middle"
              fontSize={50}
              fontWeight={900}
              fill={palette.ink[9]}
            >
              {running || result ? fmt(got[b], dp) : ""}
            </text>
          </g>
        );
      })}
      {/* Levers, drawn last so they're on top */}
      {job.hoppers.map((h, i) => {
        const x = xs[i] ?? 0;
        const bin = route[i];
        return (
          // biome-ignore lint/a11y/useSemanticElements: rough prototype lever
          <g
            // biome-ignore lint/suspicious/noArrayIndexKey: hoppers are fixed per job
            key={`lever-${i}-${h}`}
            role="button"
            aria-label={`Lever ${i + 1}`}
            onPointerDown={() => flip(i)}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={x}
              cy={leverY}
              r={36}
              fill={bin ? binColor[bin] : palette.slate[1]}
              stroke={palette.ink[7]}
              strokeWidth={4}
            />
            <text
              x={x}
              y={leverY + 12}
              textAnchor="middle"
              fontSize={34}
              fontWeight={900}
              fill={palette.ink[9]}
            >
              {bin === "A" ? "◀" : bin === "B" ? "▶" : "?"}
            </text>
          </g>
        );
      })}
    </svg>
  );

  const caption = `Blue bin: ${fmt(job.need.A, dp)}. Yellow bin: ${fmt(job.need.B, dp)}. Send every hopper to a bin so both are exactly full.`;

  return (
    <Stage
      avatar={<Avatar expression={done ? "cheering" : mood} size={80} />}
      caption={caption}
      progress={`${Math.min(round + 1, jobsPerRound)} / ${jobsPerRound}`}
      action={
        solved ? (
          <BigButton tone="next" onClick={next}>
            {done ? "Play again" : "Next →"}
          </BigButton>
        ) : (
          <BigButton onClick={run} disabled={running || route.some((b) => !b)}>
            {running ? "Running…" : "Run ▶"}
          </BigButton>
        )
      }
      scene={scene}
    />
  );
}
