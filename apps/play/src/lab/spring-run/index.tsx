// Spring Run: set every spring with a fraction card, press play, and the
// avatar runs the course. A spring throws it exactly that far, so a wrong
// card drops it in the water. Rough prototype; see ../README.md.
import { palette } from "@repo/tokens";
import { useEffect, useRef, useState } from "react";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  title: "Spring Run",
  pitch:
    "Put a fraction card on each spring, then press play. Your avatar runs the course, and each spring throws it exactly that far: the wrong card and it lands in the water.",
  expectations: [
    "math-2020.g3.B2.8",
    "math-2020.g4.B1.4",
    "math-2020.g4.B1.6",
    "math-2020.g5.B1.3",
    "math-2020.g5.B1.4",
  ],
  misconceptions: [
    {
      id: "bigger-denominator-bigger",
      fails:
        "Putting 3/8 where 3/4 is needed because 8 is more than 4: the spring throws the avatar half as far and it drops in the water short of the island.",
    },
    {
      id: "improper-less-than-one",
      fails:
        "Saving 5/4 for a short gap because it 'looks small': the avatar sails past the island, over a whole and a bit.",
    },
    {
      id: "equivalent-is-different",
      fails:
        "At G5, refusing 2/4 or 6/12 for a gap of one half and picking a card that 'looks like' a half instead: the avatar misses, while the equivalent card would have landed.",
    },
  ],
  sampleTask:
    "math-2020.g4.B1.4, sample task 3: placing fraction cards on a number line from 0 to 1, using the fraction tower to check the order. Here the line is the ground and the check is the jump.",
  fun: "Plan, then press play and watch it go, like Lemmings or Poly Bridge, with Mario's springs and splashes. The run is the answer: you see exactly where it went wrong, and fixing one card and running again is quick.",
  isArchived: true,
};

interface Frac {
  n: number;
  d: number;
}

interface Level {
  /** Grid units per whole. Every position is a count of these. */
  unit: number;
  /** Wholes shown. */
  wholes: number;
  /** Where the first spring sits, in units. */
  start: number;
  /** Island positions in units; the last one has the flag. */
  islands: number[];
  /** The cards in hand: the right ones and some decoys, shuffled. */
  hand: Frac[];
  /** Tick marks every this many units. */
  tick: number;
}

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(list: readonly T[]): T => list[rand(list.length)] as T;
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);
const units = (f: Frac, unit: number) => (f.n * unit) / f.d;

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

const families: Record<number, readonly (readonly number[])[]> = {
  3: [[3], [4], [5], [6], [8]],
  4: [[2], [3], [4], [5], [6], [8], [10]],
  5: [
    [2, 4, 8],
    [2, 3, 6, 12],
    [3, 6, 12],
    [2, 4, 12],
    [2, 5, 10],
  ],
};

function makeLevel(grade: number): Level {
  const g = Math.min(5, Math.max(3, grade));
  for (;;) {
    const family = pick(families[g] ?? families[3] ?? []);
    const unit = family.reduce(lcm, 1);
    const room = g === 3 ? 2 : 3;
    const start = Math.round(unit / 4) || 1;
    const maxJump = g === 3 ? Math.round(unit * 1.25) : Math.round(unit * 1.75);
    const jumps: Frac[] = [];
    let at = start;
    for (let i = 0; i < 3; i++) {
      const d = pick(family);
      const step = unit / d;
      const n = 1 + rand(Math.floor(maxJump / step));
      jumps.push({ n, d });
      at += n * step;
    }
    // Leave room for the last island; no jump shorter than two units, so the
    // island isn't touching the spring.
    if (at > room * unit - 1) continue;
    if (jumps.some((f) => units(f, unit) < 2)) continue;
    // From G4 the course goes past one whole.
    if (g >= 4 && at <= unit) continue;
    // The course is drawn only as long as it needs, so islands spread out.
    const wholes = Math.max(2, Math.ceil((at + 1) / unit));
    const islands: number[] = [];
    let p = start;
    for (const f of jumps) {
      p += units(f, unit);
      islands.push(p);
    }
    const decoys = makeDecoys(jumps, family, unit, g);
    if (decoys.length < 2) continue;
    // G5 shows the right amounts as an equivalent card where it can.
    const shown = jumps.map((f) => (g === 5 ? disguise(f, family) : f));
    return {
      unit,
      wholes,
      start,
      islands,
      hand: shuffle([...shown, ...decoys.slice(0, 2)]),
      tick: g === 5 ? unit / Math.min(...family) : unit / (family[0] ?? 1),
    };
  }
}

/** A card that equals `f` with another denominator in the family, if one exists. */
function disguise(f: Frac, family: readonly number[]): Frac {
  const options = family
    .filter((d) => d !== f.d && (f.n * d) % f.d === 0)
    .map((d) => ({ n: (f.n * d) / f.d, d }));
  return options.length > 0 && Math.random() < 0.7 ? pick(options) : f;
}

/** Wrong cards that a real wrong idea would pick. None equals a right one. */
function makeDecoys(
  jumps: Frac[],
  family: readonly number[],
  unit: number,
  g: number,
): Frac[] {
  const candidates: Frac[] = [];
  for (const f of jumps) {
    // Same top, other bottom: bigger-denominator-bigger.
    for (const d of family) if (d !== f.d) candidates.push({ n: f.n, d });
    if (family.length === 1) {
      const other = pick([2, 3, 4, 5, 6, 8, 10].filter((d) => d !== f.d));
      if (g >= 4 || other <= 8) candidates.push({ n: f.n, d: other });
    }
    // One more or one less of the unit.
    candidates.push({ n: f.n + 1, d: f.d });
    if (f.n > 1) candidates.push({ n: f.n - 1, d: f.d });
    // Top and bottom swapped.
    if (g >= 4 && f.n !== f.d) candidates.push({ n: f.d, d: f.n });
  }
  const values = jumps.map((f) => units(f, unit));
  const out: Frac[] = [];
  for (const c of shuffle(candidates)) {
    if (c.n < 1 || c.d < 2 || c.d > 12) continue;
    const v = (c.n * unit) / c.d;
    if (values.some((x) => Math.abs(x - v) < 1e-9)) continue;
    if (out.some((o) => Math.abs((o.n * unit) / o.d - v) < 1e-9)) continue;
    if (c.n / c.d > 2.5) continue;
    out.push(c);
  }
  return out;
}

// Words for speech.
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
const say = (f: Frac) => {
  const [one, many] = parts[f.d] ?? ["part", "parts"];
  return `${small[f.n] ?? f.n} ${f.n === 1 ? one : many}`;
};

// Layout, in viewBox units.
const W = 1000;
const H = 420;
const left = 40;
const right = 960;
const groundY = 300;
const islandW = 34;

type Phase = "setup" | "running" | "splash" | "won";

interface Move {
  kind: "run" | "jump" | "fall";
  from: number;
  to: number;
  ms: number;
}

export default function SpringRun({ grade, Avatar, speak }: PrototypeProps) {
  const [level, setLevel] = useState(() => makeLevel(grade));
  const [springs, setSprings] = useState<(number | null)[]>([null, null, null]);
  const [held, setHeld] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [pos, setPos] = useState({ x: level.start, y: 0 });
  const [splashAt, setSplashAt] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const frame = useRef(0);

  const x = (u: number) =>
    left + ((right - left) * u) / (level.wholes * level.unit);
  const springAt = [level.start, ...level.islands.slice(0, -1)];
  const flag = level.islands[level.islands.length - 1] ?? 0;

  useEffect(() => {
    if (round === 1)
      speak(
        "Put a card on every spring. Each spring throws you that far. Then press play!",
      );
  }, [round, speak]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const tapCard = (i: number) => {
    if (phase !== "setup") return;
    setHeld(held === i ? null : i);
    const card = level.hand[i];
    if (card && held !== i) speak(say(card));
  };

  const tapSpring = (s: number) => {
    if (phase !== "setup") return;
    if (held === null) {
      // Tapping a set spring takes its card back.
      setSprings((list) => list.map((c, i) => (i === s ? null : c)));
      return;
    }
    setSprings((list) =>
      list.map((c, i) => (i === s ? held : c === held ? null : c)),
    );
    setHeld(null);
  };

  const play = () => {
    if (springs.some((c) => c === null)) {
      speak("Every spring needs a card first.");
      return;
    }
    // Simulate the whole run, then animate it.
    const moves: Move[] = [];
    let at = level.start;
    let landed: number | null = null;
    let fellAt: number | null = null;
    for (let guard = 0; guard < 10; guard++) {
      const s = springAt.indexOf(at);
      const card = s >= 0 ? level.hand[springs[s] ?? -1] : undefined;
      if (!card) break;
      const to = at + units(card, level.unit);
      moves.push({ kind: "run", from: at, to: at, ms: 250 });
      moves.push({
        kind: "jump",
        from: at,
        to,
        ms: 500 + (to - at) * (900 / level.unit),
      });
      if (!level.islands.includes(to)) {
        moves.push({ kind: "fall", from: to, to, ms: 600 });
        fellAt = to;
        break;
      }
      at = to;
      landed = to;
      if (to === flag) break;
    }
    setPhase("running");
    setHeld(null);
    const started = performance.now();
    const total = moves.reduce((t, m) => t + m.ms, 0);
    const tick = (now: number) => {
      let t = now - started;
      for (const m of moves) {
        if (t <= m.ms) {
          const k = t / m.ms;
          if (m.kind === "jump") {
            const span = (m.to - m.from) / level.unit;
            setPos({
              x: m.from + (m.to - m.from) * k,
              y: 4 * k * (1 - k) * (0.5 + span * 0.5),
            });
          } else if (m.kind === "fall") {
            setPos({ x: m.from, y: -k * 1.4 });
          } else {
            setPos({ x: m.to, y: 0 });
          }
          frame.current = requestAnimationFrame(tick);
          return;
        }
        t -= m.ms;
      }
      // Done.
      if (fellAt !== null) {
        setSplashAt(fellAt);
        setPhase("splash");
        const from = landed ?? level.start;
        const next = level.islands.find((p) => p > from) ?? flag;
        const s = springAt.indexOf(from);
        const card = level.hand[springs[s] ?? -1];
        const how = fellAt < next ? "Not far enough!" : "Too far!";
        speak(
          card
            ? `Splash! That spring threw you ${say(card)}. ${how} Fix a card and try again.`
            : "Splash!",
        );
      } else if (landed === flag) {
        setPhase("won");
        speak("You made it to the flag!");
      }
    };
    if (total > 0) frame.current = requestAnimationFrame(tick);
  };

  const retry = () => {
    setPos({ x: level.start, y: 0 });
    setSplashAt(null);
    setPhase("setup");
  };

  const next = () => {
    const fresh = makeLevel(grade);
    setLevel(fresh);
    setSprings([null, null, null]);
    setPos({ x: fresh.start, y: 0 });
    setSplashAt(null);
    setPhase("setup");
    setRound((r) => r + 1);
    speak("A new course. Set the springs!");
  };

  const ticks = Array.from(
    { length: Math.floor((level.wholes * level.unit) / level.tick) + 1 },
    (_, i) => i * level.tick,
  );
  const avatarSize = 64;
  const mood =
    phase === "won"
      ? "cheering"
      : phase === "splash"
        ? "encouraging"
        : phase === "running"
          ? "happy"
          : "thinking";

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
      <div style={{ position: "relative", width: "100%" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", display: "block", touchAction: "none" }}
          role="img"
          aria-label="The course"
        >
          <rect width={W} height={H} fill={palette.sky[1]} rx={16} />
          <rect
            y={groundY + 20}
            width={W}
            height={H - groundY - 20}
            fill={palette.sky[4]}
          />
          {/* Start platform */}
          <rect
            x={0}
            y={groundY}
            width={x(level.start) + 6}
            height={H - groundY}
            fill={palette.leaf[5]}
          />
          {level.islands.map((p) => (
            <rect
              key={p}
              x={x(p) - islandW / 2}
              y={groundY}
              width={islandW}
              height={H - groundY}
              fill={palette.leaf[5]}
              rx={4}
            />
          ))}
          {/* The number line along the water */}
          <line
            x1={x(0)}
            x2={x(level.wholes * level.unit)}
            y1={H - 50}
            y2={H - 50}
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
                  y1={H - 50 - (whole ? 14 : 7)}
                  y2={H - 50 + (whole ? 14 : 7)}
                  stroke="var(--k-ink)"
                  strokeWidth={whole ? 4 : 2}
                />
                {whole && (
                  <text
                    x={x(t)}
                    y={H - 14}
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
          {/* Flag */}
          <line
            x1={x(flag)}
            x2={x(flag)}
            y1={groundY - 110}
            y2={groundY}
            stroke="var(--k-ink)"
            strokeWidth={4}
          />
          <path
            d={`M ${x(flag)} ${groundY - 110} l 40 14 l -40 14 z`}
            fill={palette.ember[5]}
          />
          {splashAt !== null && (
            <text
              x={x(splashAt)}
              y={groundY + 50}
              textAnchor="middle"
              fontSize={40}
            >
              💦
            </text>
          )}
        </svg>
        {/* Springs, as buttons over the course */}
        {springAt.map((p, s) => {
          const card =
            springs[s] === null ? undefined : level.hand[springs[s] ?? -1];
          return (
            <button
              key={p}
              type="button"
              onClick={() => tapSpring(s)}
              aria-label={card ? `Spring with ${say(card)}` : "Empty spring"}
              style={{
                position: "absolute",
                left: `${(x(p) / W) * 100}%`,
                top: `${((groundY + 4) / H) * 100}%`,
                transform: "translate(-50%, 0)",
                minWidth: 56,
                minHeight: 56,
                borderRadius: 12,
                border: `3px ${card ? "solid" : "dashed"} var(--k-border-strong)`,
                background:
                  held !== null && phase === "setup"
                    ? palette.sunshine[1]
                    : "var(--k-surface-raised)",
                fontSize: 20,
                fontWeight: 800,
                padding: 4,
                cursor: "pointer",
              }}
            >
              {card ? <FracLabel f={card} /> : "?"}
            </button>
          );
        })}
        <div
          style={{
            position: "absolute",
            left: `${(x(pos.x) / W) * 100}%`,
            top: `${((groundY - pos.y * 160) / H) * 100}%`,
            transform: "translate(-50%, -100%)",
            pointerEvents: "none",
            opacity: pos.y < -0.3 ? 0.4 : 1,
          }}
        >
          <Avatar expression={mood} size={avatarSize} />
        </div>
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
        {level.hand.map((card, i) => {
          const used = springs.includes(i);
          return (
            <button
              // biome-ignore lint/suspicious/noArrayIndexKey: cards can repeat
              key={i}
              type="button"
              onClick={() => tapCard(i)}
              disabled={phase !== "setup"}
              style={{
                minWidth: 72,
                minHeight: 88,
                borderRadius: 12,
                border: `4px solid ${held === i ? "var(--k-focus)" : "var(--k-border-strong)"}`,
                background: used
                  ? "var(--k-surface-sunken)"
                  : "var(--k-surface-raised)",
                opacity: used ? 0.5 : 1,
                fontSize: 28,
                fontWeight: 800,
                transform: held === i ? "translateY(-8px)" : undefined,
                cursor: "pointer",
              }}
            >
              <FracLabel f={card} />
            </button>
          );
        })}
        {phase === "setup" && (
          <button type="button" onClick={play} style={bigButton}>
            ▶ Play
          </button>
        )}
        {phase === "splash" && (
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

function FracLabel({ f }: { f: Frac }) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        lineHeight: 1,
      }}
    >
      <span>{f.n}</span>
      <span
        style={{
          borderTop: "3px solid currentColor",
          alignSelf: "stretch",
          margin: "2px 0",
        }}
      />
      <span>{f.d}</span>
    </span>
  );
}
