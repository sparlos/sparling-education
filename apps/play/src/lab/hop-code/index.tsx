// Hop Code: build a route out of fraction hops, press play, and the avatar
// hops it. The flag is hidden: only its fraction says
// where it is. Every hop has to land on ground, and the last one on the flag.
// Rough prototype; see ../README.md.
import { palette } from "@repo/tokens";
import { useEffect, useRef, useState } from "react";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  title: "Hop Code",
  pitch:
    "The goal is hidden somewhere over the water; all you get is its fraction. Snap hop blocks together (¼ hop, ½ hop, 1 hop…) within a hop budget, then press play and watch your avatar hop it.",
  expectations: [
    "math-2020.g3.B2.8",
    "math-2020.g4.B1.6",
    "math-2020.g4.B2.7",
    "math-2020.g5.B1.3",
    "math-2020.g5.B2.5",
  ],
  misconceptions: [
    {
      id: "bigger-denominator-bigger",
      fails:
        "Using ⅛ hops to clear a gap because 8 is bigger than 4: the hop is tiny and lands in the water right at the edge. Blocks all look the same, so only the fraction says how far they go.",
    },
    {
      id: "numerator-not-a-count",
      fails:
        "Planning three ¼ hops to reach the hidden flag at 3/8, matching the top number without the unit: the avatar overshoots onto a stone past the flag and is told it landed at three fourths, not three eighths.",
    },
    {
      id: "stops-at-one",
      fails:
        "At G4, stopping the route at 1 when the flag is at 7/4, as if fractions end at one whole: the avatar stands at 1 and is told the flag is still ahead.",
    },
    {
      id: "no-equivalence",
      fails:
        "Building every route from the smallest hop: the plan runs out of hops before the flag, because two ¼ hops have to be traded for one ½ hop to fit the budget.",
    },
  ],
  sampleTask:
    "math-2020.g4.B2.7, sample task 1: building 4/5 out of one-fifth strips and connecting it to 1/5 + 1/5 + 1/5 + 1/5. Here each strip is a hop.",
  fun: "Program a route, then press play and watch it run, like a coding game (Lightbot) crossed with Mario's hops over pits and coins. The plan is a puzzle with a hop budget; the run is the reveal, and a splash shows exactly which hop was wrong.",
};

interface Block {
  /** The hop's length in grid units. */
  units: number;
  n: number;
  d: number;
}

interface Fraction {
  n: number;
  d: number;
}

interface Level {
  grade: number;
  /** Grid units per whole. */
  unit: number;
  wholes: number;
  /** Solid grid points, including decoys past the flag. */
  ground: Set<number>;
  flag: number;
  coins: number[];
  blocks: Block[];
  /** The most hops a plan may have. */
  budget: number;
  /** Ticks every this many units. */
  tick: number;
  /** How the flag's position is shown. */
  flagLabel: Fraction;
}

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(list: readonly T[]): T => list[rand(list.length)] as T;

// The hop blocks offered at each grade, as fractions, by level.
const sets: Record<number, readonly (readonly [number, number][])[]> = {
  3: [
    [
      [1, 4],
      [1, 1],
    ],
    [
      [1, 3],
      [1, 1],
    ],
    [
      [1, 2],
      [1, 4],
    ],
    [
      [1, 5],
      [1, 1],
    ],
  ],
  4: [
    [
      [1, 4],
      [1, 2],
      [1, 1],
    ],
    [
      [1, 3],
      [1, 6],
      [1, 1],
    ],
    [
      [1, 5],
      [1, 10],
      [1, 2],
    ],
    [
      [1, 8],
      [1, 4],
      [1, 2],
    ],
  ],
  5: [
    [
      [1, 12],
      [1, 6],
      [1, 4],
      [1, 3],
    ],
    [
      [1, 8],
      [1, 4],
      [1, 2],
    ],
    [
      [1, 6],
      [1, 3],
      [1, 2],
    ],
    [
      [1, 10],
      [1, 5],
      [1, 2],
    ],
  ],
};

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);

function makeLevel(grade: number): Level {
  const g = Math.min(5, Math.max(3, grade));
  for (;;) {
    const set = pick(sets[g] ?? sets[3] ?? []);
    const unit = set.reduce((u, [, d]) => lcm(u, d), 1);
    const blocks = set
      .map(([n, d]) => ({ n, d, units: (n * unit) / d }))
      .sort((a, b) => a.units - b.units);
    const routeEnd = (g === 3 ? 2 : 3) * unit;
    // A random route that uses every block at least once.
    const route: number[] = [];
    let at = 0;
    const hops = 4 + rand(g === 3 ? 3 : 4);
    for (let i = 0; i < hops; i++) {
      const b = i < blocks.length ? blocks[i] : pick(blocks);
      if (!b) break;
      if (at + b.units > routeEnd) break;
      at += b.units;
      route.push(at);
    }
    if (route.length < 4) continue;
    const flag = at;
    if (flag < unit) continue;
    // At least half a whole of course past the flag, so where the course
    // ends doesn't give the flag away.
    const wholes = Math.ceil((flag + unit / 2) / unit);
    const end = wholes * unit;
    const ground = new Set<number>([0, ...route]);
    // Extra stones that aren't on the route, all along the course, so the
    // last stone doesn't give the flag away either.
    for (let p = 1; p <= end; p++) {
      if (!ground.has(p) && Math.random() < (p > flag ? 0.35 : 0.18))
        ground.add(p);
    }
    if (![...ground].some((p) => p > flag))
      ground.add(flag + 1 + rand(end - flag));
    // The route must not be walkable with the smallest hop alone.
    const smallest = blocks[0]?.units ?? 1;
    let walkable = true;
    for (let p = smallest; p <= flag; p += smallest)
      if (!ground.has(p)) walkable = false;
    if (walkable) continue;
    // The fewest hops to the flag, stone to stone. Stones only lie ahead, so
    // one pass in order finds it.
    const fewest = new Map<number, number>([[0, 0]]);
    for (let p = 0; p < flag; p++) {
      const k = fewest.get(p);
      if (k === undefined) continue;
      for (const b of blocks) {
        const q = p + b.units;
        if (q <= flag && ground.has(q) && (fewest.get(q) ?? Infinity) > k + 1)
          fewest.set(q, k + 1);
      }
    }
    const coins = route
      .slice(0, -1)
      .filter(() => Math.random() < 0.35)
      .slice(0, 2);
    const level = {
      grade: g,
      unit,
      wholes,
      ground,
      flag,
      coins,
      blocks,
      // G3 gets one spare hop; G4 and G5 must find the shortest plan.
      budget: (fewest.get(flag) ?? route.length) + (g === 3 ? 1 : 0),
      // Ticks split each whole by the largest denominator on offer.
      tick: blocks[0]?.units ?? unit,
      flagLabel: { n: 0, d: 1 },
    };
    level.flagLabel = place(level, flag);
    if (level.flagLabel.d === 1 && g >= 4) continue;
    return level;
  }
}

/**
 * A point on the course as a fraction. G3 sees it in the smallest block's
 * unit; G4 and G5 see the simplest fraction, which may need counting past one
 * or converting.
 */
function place(level: Pick<Level, "grade" | "unit" | "blocks">, units: number) {
  const small = level.blocks[0] ?? { n: 1, d: 1 };
  return level.grade === 3
    ? { n: (units * small.d) / level.unit, d: small.d }
    : simplify(units, level.unit);
}

function simplify(n: number, d: number) {
  const k = gcd(n, d);
  return { n: n / k, d: d / k };
}

const small = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
];
const parts: Record<number, [string, string]> = {
  2: ["half", "halves"],
  3: ["third", "thirds"],
  4: ["fourth", "fourths"],
  5: ["fifth", "fifths"],
  6: ["sixth", "sixths"],
  7: ["seventh", "sevenths"],
  8: ["eighth", "eighths"],
  9: ["ninth", "ninths"],
  10: ["tenth", "tenths"],
  12: ["twelfth", "twelfths"],
};
function words(f: Fraction) {
  if (f.d === 1) return small[f.n] ?? String(f.n);
  const name = parts[f.d];
  if (!name) return `${f.n} over ${f.d}`;
  return `${small[f.n] ?? f.n} ${f.n === 1 ? name[0] : name[1]}`;
}
const hopWords = (b: Block) =>
  b.d === 1 ? "a whole hop" : `a ${words(b)} hop`;

const W = 1000;
const H = 400;
const left = 50;
const right = 950;
const groundY = 270;

type Phase = "setup" | "running" | "splash" | "past" | "short" | "won";

export default function HopCode({ grade, Avatar, speak }: PrototypeProps) {
  const [level, setLevel] = useState(() => makeLevel(grade));
  const [plan, setPlan] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [current, setCurrent] = useState<number | null>(null);
  const [trail, setTrail] = useState<number[]>([]);
  const [got, setGot] = useState<number[]>([]);
  const [round, setRound] = useState(1);
  const frame = useRef(0);

  const end = level.wholes * level.unit;
  const x = (u: number) => left + ((right - left) * u) / end;
  const cell = (right - left) / end;

  useEffect(() => {
    if (round === 1)
      speak(
        `The goal is hidden at ${words(level.flagLabel)}. Plan it in ${level.budget} hops or fewer, and land every hop on grass.`,
      );
  }, [round, speak, level.flagLabel, level.budget]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const add = (i: number) => {
    if (phase !== "setup") return;
    if (plan.length >= level.budget) {
      speak(`That's all ${level.budget} hops. Try bigger hops.`);
      return;
    }
    const b = level.blocks[i];
    if (b) speak(hopWords(b));
    setPlan((p) => [...p, i]);
  };
  const remove = (k: number) => {
    if (phase !== "setup") return;
    setPlan((p) => p.filter((_, j) => j !== k));
  };

  const play = () => {
    if (plan.length === 0) {
      speak("Add some hops first.");
      return;
    }
    // Simulate: where each hop lands, and where it stops.
    const landings: number[] = [];
    let at = 0;
    let fell = false;
    for (const i of plan) {
      at += level.blocks[i]?.units ?? 0;
      landings.push(at);
      if (!level.ground.has(at)) {
        fell = true;
        break;
      }
      if (at > level.flag) break;
    }
    setPhase("running");
    setTrail([]);
    setGot([]);
    const hopMs = 650;
    const started = performance.now();
    const tick = (now: number) => {
      const t = now - started;
      const k = Math.floor(t / hopMs);
      if (k < landings.length) {
        const from = k === 0 ? 0 : (landings[k - 1] ?? 0);
        const to = landings[k] ?? 0;
        const f = (t - k * hopMs) / hopMs;
        const span = (to - from) / level.unit;
        setCurrent(k);
        setPos({
          x: from + (to - from) * f,
          y: 4 * f * (1 - f) * (0.3 + span * 0.6),
        });
        setTrail(landings.slice(0, k));
        setGot(level.coins.filter((c) => landings.slice(0, k).includes(c)));
        frame.current = requestAnimationFrame(tick);
        return;
      }
      const last = landings[landings.length - 1] ?? 0;
      setTrail(landings);
      setGot(level.coins.filter((c) => landings.includes(c)));
      if (fell) {
        // Sink.
        const sinkT = t - landings.length * hopMs;
        if (sinkT < 600) {
          setPos({ x: last, y: -(sinkT / 600) * 1.2 });
          frame.current = requestAnimationFrame(tick);
          return;
        }
        setPhase("splash");
        const b = level.blocks[plan[landings.length - 1] ?? -1];
        speak(
          `Splash! Hop ${landings.length}${b ? `, ${hopWords(b)},` : ""} landed in the water.`,
        );
      } else if (last === level.flag) {
        setPos({ x: last, y: 0 });
        setPhase("won");
        speak("You found the goal!");
      } else if (last > level.flag) {
        setPos({ x: last, y: 0 });
        setPhase("past");
        speak(
          `You landed at ${words(place(level, last))}, past the goal at ${words(level.flagLabel)}.`,
        );
      } else {
        setPos({ x: last, y: 0 });
        setPhase("short");
        speak(
          `You stopped at ${words(place(level, last))}. The goal is at ${words(level.flagLabel)}.`,
        );
      }
      setCurrent(null);
    };
    frame.current = requestAnimationFrame(tick);
  };

  const retry = () => {
    setPos({ x: 0, y: 0 });
    setTrail([]);
    setGot([]);
    setPhase("setup");
  };

  const next = () => {
    const fresh = makeLevel(grade);
    setLevel(fresh);
    setPlan([]);
    retry();
    setRound((r) => r + 1);
    speak(
      `A new course. The goal is hidden at ${words(fresh.flagLabel)}. You have ${fresh.budget} hops.`,
    );
  };

  const mood =
    phase === "won"
      ? "cheering"
      : phase === "splash" || phase === "short" || phase === "past"
        ? "encouraging"
        : phase === "running"
          ? "happy"
          : "thinking";

  const ticks = Array.from(
    { length: Math.floor(end / level.tick) + 1 },
    (_, i) => i * level.tick,
  );

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        padding: 16,
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 24,
          justifyContent: "center",
          alignItems: "center",
          fontSize: 26,
          fontWeight: 800,
        }}
      >
        <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
          Goal at
          <span
            style={{
              background: "var(--k-surface-raised)",
              border: "3px solid var(--k-border-strong)",
              borderRadius: 10,
              padding: "2px 10px",
            }}
          >
            <FracLabel n={level.flagLabel.n} d={level.flagLabel.d} />
          </span>
        </span>
        <span>
          Hops {plan.length} / {level.budget}
        </span>
      </div>

      <div style={{ position: "relative", width: "100%" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", display: "block" }}
          role="img"
          aria-label="The course"
        >
          <rect width={W} height={H} fill={palette.sky[1]} rx={16} />
          <rect
            y={groundY + 16}
            width={W}
            height={H - groundY - 16}
            fill={palette.sky[4]}
          />
          {[...level.ground].map((p) => (
            <rect
              key={p}
              x={x(p) - cell / 2 + 1}
              y={groundY}
              width={cell - 2}
              height={64}
              fill={palette.leaf[5]}
              rx={3}
            />
          ))}
          {/* The start needs a ledge. */}
          <rect
            x={0}
            y={groundY}
            width={x(0)}
            height={64}
            fill={palette.leaf[5]}
          />
          {/* Number line */}
          <line
            x1={x(0)}
            x2={x(end)}
            y1={H - 46}
            y2={H - 46}
            stroke="var(--k-ink)"
            strokeWidth={3}
          />
          {ticks.map((t) => {
            const whole = t % level.unit === 0;
            return (
              <g key={t}>
                <line
                  x1={x(t)}
                  x2={x(t)}
                  y1={H - 46 - (whole ? 14 : 7)}
                  y2={H - 46 + (whole ? 14 : 7)}
                  stroke="var(--k-ink)"
                  strokeWidth={whole ? 4 : 2}
                />
                {whole && (
                  <text
                    x={x(t)}
                    y={H - 10}
                    textAnchor="middle"
                    fontSize={26}
                    fontWeight={700}
                    fill="var(--k-ink)"
                  >
                    {t / level.unit}
                  </text>
                )}
              </g>
            );
          })}
          {/* Trail of landings */}
          {trail.map((p, k) => {
            const from = k === 0 ? 0 : (trail[k - 1] ?? 0);
            const mid = (x(from) + x(p)) / 2;
            return (
              <path
                // biome-ignore lint/suspicious/noArrayIndexKey: a trail can revisit a spot
                key={k}
                d={`M ${x(from)} ${groundY - 4} Q ${mid} ${groundY - 60 - (p - from) * cell * 0.25} ${x(p)} ${groundY - 4}`}
                fill="none"
                stroke="var(--k-ink-muted)"
                strokeWidth={3}
                strokeDasharray="8 6"
              />
            );
          })}
          {level.coins.map((c) => (
            <circle
              key={c}
              cx={x(c)}
              cy={groundY - 110}
              r={16}
              fill={palette.sunshine[4]}
              stroke={palette.sunshine[7]}
              strokeWidth={3}
              opacity={got.includes(c) ? 0.15 : 1}
            />
          ))}
          {/* The flag only shows once it's found: its fraction is the clue. */}
          {phase === "won" && (
            <>
              <line
                x1={x(level.flag)}
                x2={x(level.flag)}
                y1={groundY - 120}
                y2={groundY}
                stroke="var(--k-ink)"
                strokeWidth={4}
              />
              <path
                d={`M ${x(level.flag)} ${groundY - 120} l 44 15 l -44 15 z`}
                fill={palette.ember[5]}
              />
            </>
          )}
        </svg>
        <div
          style={{
            position: "absolute",
            left: `${(x(pos.x) / W) * 100}%`,
            top: `${((groundY - pos.y * 150) / H) * 100}%`,
            transform: "translate(-50%, -100%)",
            pointerEvents: "none",
            opacity: pos.y < -0.3 ? 0.4 : 1,
          }}
        >
          <Avatar expression={mood} size={60} />
        </div>
      </div>

      {/* The plan */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          minHeight: 76,
          padding: 8,
          borderRadius: 12,
          border: "3px dashed var(--k-border-strong)",
          alignItems: "center",
        }}
        aria-label="Your plan"
      >
        {plan.length === 0 && (
          <span style={{ color: "var(--k-ink-muted)", fontSize: 20 }}>
            Tap hops below to build your plan →
          </span>
        )}
        {plan.map((i, k) => {
          const b = level.blocks[i];
          if (!b) return null;
          return (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: a plan repeats blocks
              key={k}
              type="button"
              onClick={() => remove(k)}
              aria-label={`Remove ${hopWords(b)}`}
              style={{
                ...blockStyle,
                outline: current === k ? "4px solid var(--k-focus)" : undefined,
              }}
            >
              <FracLabel n={b.n} d={b.d} />
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {level.blocks.map((b, i) => (
          <button
            key={`${b.n}/${b.d}`}
            type="button"
            onClick={() => add(i)}
            disabled={phase !== "setup"}
            aria-label={`Add ${hopWords(b)}`}
            style={{ ...blockStyle, minHeight: 80, fontSize: 26 }}
          >
            <FracLabel n={b.n} d={b.d} />
          </button>
        ))}
        {phase === "setup" && (
          <button type="button" onClick={play} style={bigButton}>
            ▶ Play
          </button>
        )}
        {(phase === "splash" || phase === "short" || phase === "past") && (
          <button type="button" onClick={retry} style={bigButton}>
            ↺ Fix it
          </button>
        )}
        {phase === "won" && (
          <button type="button" onClick={next} style={bigButton}>
            Next course →
          </button>
        )}
      </div>
    </div>
  );
}

// Every block looks the same and none is drawn to scale: how far a hop goes
// has to come from its fraction.
const blockStyle = {
  minWidth: 60,
  minHeight: 60,
  borderRadius: 10,
  border: "3px solid var(--k-border-strong)",
  background: palette.sunshine[2],
  fontSize: 20,
  fontWeight: 800,
  padding: "4px 10px",
  cursor: "pointer",
} as const;

const bigButton = {
  minHeight: 72,
  padding: "0 28px",
  borderRadius: 16,
  border: "none",
  background: "var(--k-student-fill)",
  color: "var(--k-student-on-fill)",
  fontSize: 26,
  fontWeight: 800,
  cursor: "pointer",
} as const;

function FracLabel({ n, d }: { n: number; d: number }) {
  if (d === 1) return <span>{n}</span>;
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        lineHeight: 1,
      }}
    >
      <span>{n}</span>
      <span
        style={{
          borderTop: "3px solid currentColor",
          alignSelf: "stretch",
          margin: "2px 0",
        }}
      />
      <span>{d}</span>
    </span>
  );
}
