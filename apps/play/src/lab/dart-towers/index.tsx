// Dart Towers: a defence game. Bugs march in lanes, one tower to a lane, in
// rows you can see. Say how many darts to load, press go, and watch the towers
// spend them part by part. Rough prototype; see ../README.md.
import { palette } from "@repo/tokens";
import { useEffect, useMemo, useState } from "react";
import { BigButton, fmt, NumberPad, Stage, wait } from "../add-sub-kit.tsx";
import { tween } from "../mult-kit.tsx";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  title: "Dart Towers",
  pitch:
    "Bugs march at your wall: 6 lanes with 27 in each, coloured in two parts, 6 × 20 and 6 × 7. Type how many darts to load, press go, and watch the towers clear each part in turn. Load too few and bugs reach your wall; load too many and the extras fly on and smash the greenhouse behind the bugs, so it has to be exact. The journey is one night: six waves, the sky lightening after each, until the sun comes up.",
  expectations: ["math-2020.g3.B2.6", "math-2020.g4.B2.5", "math-2020.g5.B2.6"],
  misconceptions: [
    {
      id: "adds-instead-of-multiplies",
      fails:
        "For 6 lanes of 9, loading 6 + 9 = 15 darts: the towers run out almost at once, and 39 bugs reach the wall.",
    },
    {
      id: "forgets-to-multiply-the-ones",
      fails:
        "For 6 lanes of 27, loading 120 + 7 = 127 darts: the 6 × 20 part clears, the darts run out early in the 6 × 7 part, and 35 of its bugs reach the wall.",
    },
    {
      id: "drops-a-partial-product",
      fails:
        "For 24 lanes of 38, loading 600 + 32 = 632 darts, the two parts you get by multiplying tens by tens and ones by ones: whole coloured parts of the swarm are still standing when the darts run out.",
    },
    {
      id: "tens-times-tens-too-big",
      fails:
        "For 24 lanes of 38, working out 20 × 30 as 6000 and loading 6312 darts: every bug is gone, and thousands of extra darts fly on and destroy the whole greenhouse.",
    },
  ],
  sampleTask:
    "math-2020.g4.B2.5, sample task 1: 27 × 6 on an open array split into (6 × 20) + (6 × 7). math-2020.g5.B2.6, sample task 1: a rectangle split into four parts by tens and ones. math-2020.g3.B2.6, sample task 1: 6 rows of 9 split using known facts.",
  fun: "Plants vs. Zombies and Bloons' hook: prepare, press go, then watch your defences work with a wave coming at you. The game makes the split itself, so there are no block sizes to work out, and you see exactly which part of the swarm got through.",
};

interface Wave {
  /** The lanes, split into parts: [20, 4] is 24 lanes. */
  rows: number[];
  /** The bugs in a lane, split into parts: [30, 8] is 38. */
  cols: number[];
}
const w = (rows: number[], cols: number[]): Wave => ({ rows, cols });

const byGrade: Record<number, Wave[]> = {
  3: [
    w([4], [5]),
    w([3], [10]),
    w([6], [5, 2]),
    w([4], [5, 1]),
    w([6], [5, 4]),
    w([7], [5, 3]),
  ],
  4: [
    w([8], [100]),
    w([3], [10, 4]),
    w([6], [20, 7]),
    w([8], [20, 1]),
    w([3], [100, 20, 4]),
    w([5], [100, 30, 6]),
  ],
  5: [
    w([10, 2], [10, 5]),
    w([10, 4], [10, 3]),
    w([20, 3], [10, 7]),
    w([20, 4], [30, 8]),
    w([30, 1], [40, 2]),
    w([40, 6], [50, 2]),
  ],
};

const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);
const partTones = [
  palette.ember[6],
  palette.sky[6],
  palette.leaf[6],
  palette.sunshine[6],
];

// The picture, 960 × 440.
const area = { x: 110, y: 66, w: 730, h: 360 };
// The greenhouse behind the bugs, which extra darts smash.
const house = { x: 858, y: 120, cols: 3, rows: 6, pane: 28, gap: 2 };
const panes = house.cols * house.rows;

interface Part {
  row: number;
  col: number;
  rows: number;
  cols: number;
  tone: string;
}

/** Any extra dart breaks at least one pane; as many extras as bugs breaks them all. */
const panesBroken = (extra: number, bugs: number) =>
  extra === 0
    ? 0
    : Math.min(panes, Math.max(1, Math.ceil((extra / bugs) * panes)));

function Greenhouse({ broken }: { broken: number }) {
  const width = house.cols * (house.pane + house.gap) + house.gap;
  const height = house.rows * (house.pane + house.gap) + house.gap;
  return (
    <g>
      <polygon
        points={`${house.x - 4},${house.y} ${house.x + width / 2},${house.y - 44} ${house.x + width + 4},${house.y}`}
        fill={broken === panes ? palette.ink[4] : palette.sky[2]}
        stroke={palette.ink[6]}
        strokeWidth={3}
      />
      <rect
        x={house.x}
        y={house.y}
        width={width}
        height={height}
        fill={palette.ink[6]}
      />
      {Array.from({ length: panes }, (_, i) => {
        const x =
          house.x + house.gap + (i % house.cols) * (house.pane + house.gap);
        const y =
          house.y +
          house.gap +
          Math.floor(i / house.cols) * (house.pane + house.gap);
        // Panes break in a scattered order, not row by row.
        const smashed = (i * 7) % panes < broken;
        const p = house.pane;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed panes
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={p}
              height={p}
              fill={smashed ? palette.ink[8] : palette.sky[2]}
            />
            {!smashed && i % 3 === 1 && (
              <circle
                cx={x + p / 2}
                cy={y + p / 2}
                r={8}
                fill={palette.leaf[5]}
              />
            )}
            {smashed && (
              <path
                d={`M${x} ${y + 4}L${x + p * 0.5} ${y + p * 0.45}L${x + p} ${y + 8}M${x + p * 0.5} ${y + p * 0.45}L${x + p * 0.3} ${y + p}M${x + p * 0.5} ${y + p * 0.45}L${x + p} ${y + p * 0.8}`}
                stroke="white"
                strokeWidth={2}
                fill="none"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

// One night, from 0 (dark) to 1 (morning).
const skyStops = [
  palette.violet[9],
  palette.violet[7],
  palette.berry[3],
  palette.sunshine[2],
  palette.sky[2],
];
const groundStops = [
  palette.ink[8],
  palette.ink[7],
  palette.ink[5],
  palette.leaf[4],
  palette.leaf[2],
];
const hillStops = [
  palette.ink[9],
  palette.violet[9],
  palette.violet[8],
  palette.leaf[7],
  palette.leaf[5],
];

function mix(stops: readonly string[], t: number): string {
  const at = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(at);
  const channel = (hex: string, c: number) =>
    Number.parseInt(hex.slice(1 + c * 2, 3 + c * 2), 16);
  const from = stops[i] ?? "#000000";
  const to = stops[i + 1] ?? from;
  const rgb = [0, 1, 2].map((c) =>
    Math.round(
      channel(from, c) + (channel(to, c) - channel(from, c)) * (at - i),
    ),
  );
  return `rgb(${rgb.join(",")})`;
}

/** The sky, the sun coming up behind the hills, and the field the bugs march on. */
function Night({ t, finale }: { t: number; finale: number }) {
  const horizon = 58 + 190 * finale;
  const radius = 26 + 50 * finale;
  const sunY = horizon + 34 - t * 56 - 90 * finale;
  return (
    <g>
      <rect width={960} height={440} fill={mix(skyStops, t)} rx={12} />
      {t > 0 && (
        <circle
          cx={480}
          cy={sunY}
          r={radius * 2.2}
          fill={palette.sunshine[2]}
          opacity={0.35 * t}
        />
      )}
      {finale > 0 &&
        Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          const from = radius + 14;
          const to = from + 70 * finale;
          return (
            <line
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed rays
              key={i}
              x1={480 + Math.cos(a) * from}
              y1={sunY + Math.sin(a) * from}
              x2={480 + Math.cos(a) * to}
              y2={sunY + Math.sin(a) * to}
              stroke={palette.sunshine[4]}
              strokeWidth={8}
              strokeLinecap="round"
            />
          );
        })}
      <circle cx={480} cy={sunY} r={radius} fill={palette.sunshine[4]} />
      <polygon
        points={`0,${horizon + 4} 0,${horizon - 22} 150,${horizon - 34} 330,${horizon - 12} 560,${horizon - 8} 760,${horizon - 38} 960,${horizon - 16} 960,${horizon + 4}`}
        fill={mix(hillStops, t)}
      />
      <rect
        y={horizon}
        width={960}
        height={440 - horizon}
        fill={mix(groundStops, t)}
      />
    </g>
  );
}

/** The last few bugs, running off the edges of the field. */
function Scatter({ t }: { t: number }) {
  return (
    <path
      fill={palette.ink[9]}
      d={Array.from({ length: 24 }, (_, i) => {
        const a = i * 2.4;
        const reach = 90 + ((i * 53) % 90) + t * 700;
        const x = 480 + Math.cos(a) * reach;
        const y = 350 + Math.sin(a) * reach * 0.4;
        return `M${x} ${y}h12v12h-12z`;
      }).join("")}
    />
  );
}

function partsOf(wave: Wave): Part[] {
  const parts: Part[] = [];
  let row = 0;
  for (const rows of wave.rows) {
    let col = 0;
    for (const cols of wave.cols) {
      parts.push({
        row,
        col,
        rows,
        cols,
        tone: partTones[parts.length % partTones.length] ?? palette.ink[6],
      });
      col += cols;
    }
    row += rows;
  }
  return parts;
}

type Phase = "plan" | "run" | "missed" | "finale";

export default function DartTowers({ grade, Avatar, speak }: PrototypeProps) {
  const waves = useMemo(
    () => byGrade[Math.min(5, Math.max(3, grade))] ?? [],
    [grade],
  );
  const [index, setIndex] = useState(0);
  const [journey, setJourney] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("plan");
  const [spent, setSpent] = useState(0);
  const [march, setMarch] = useState(0);
  const [caption, setCaption] = useState("");
  const [mood, setMood] = useState<"thinking" | "happy" | "encouraging">(
    "thinking",
  );
  const [party, setParty] = useState(0);
  const wave = waves[index];

  const ask =
    "How many darts do you need? One dart stops one bug, and extras smash the greenhouse.";
  // biome-ignore lint/correctness/useExhaustiveDependencies: start of a play
  useEffect(() => {
    const open = `Hold off the bugs until the sun comes up. ${ask}`;
    setCaption(open);
    speak(open);
  }, [waves]);

  if (!wave) return null;

  const lanes = sum(wave.rows);
  const length = sum(wave.cols);
  const bugs = lanes * length;
  const parts = partsOf(wave);
  const cell = Math.min(area.w / length, area.h / lanes, 36);
  const towerX = 40;
  const gridH = cell * lanes;
  const gridTop = area.y + (area.h - gridH) / 2;
  const size = Math.max(1.4, cell * 0.72);
  const finale = phase === "finale";
  const darts = Number(typed);
  const cleared = Math.min(spent, bugs);
  const extra = spent - cleared;

  // The bugs each part still has, clearing part by part, column by column.
  let budget = cleared;
  const standing = parts.map((part) => {
    const total = part.rows * part.cols;
    const gone = Math.min(budget, total);
    budget -= gone;
    return { part, gone, left: total - gone };
  });
  // The whole swarm moves as one, so what's left keeps its shape and its parts.
  const front = standing
    .filter((s) => s.left > 0)
    .map((s) => s.part.col + Math.floor(s.gone / s.part.rows))
    .reduce((a, b) => Math.min(a, b), length);
  const shift = march * (front * cell + area.x - towerX - 34);
  const drawn = standing.map(({ part, gone, left }) => {
    let d = "";
    for (let c = 0; c < part.cols; c++) {
      for (let r = 0; r < part.rows; r++) {
        if (c * part.rows + r < gone) continue;
        const x = area.x + (part.col + c) * cell - shift;
        const y = gridTop + (part.row + r) * cell;
        d += `M${x} ${y}h${size}v${size}h${-size}z`;
      }
    }
    return { part, d, left };
  });
  // Where the darts are landing now.
  const target = standing.find((s) => s.left > 0);
  const firing = phase === "run" && spent < darts;
  const targetX = target
    ? area.x +
      (target.part.col + Math.floor(target.gone / target.part.rows)) * cell
    : house.x;

  const go = async () => {
    if (!typed || phase !== "plan") return;
    setPhase("run");
    setCaption("Fire!");
    // One count for the whole volley, so the counter doesn't stop at the extras.
    await tween(Math.min(2600, 900 + darts * 6), (p) =>
      setSpent(Math.round(darts * p)),
    );
    if (darts === bugs) {
      setMood("happy");
      const line = `Every bug stopped, and the greenhouse is safe! ${lanes} times ${length} is ${fmt(bugs, 0)}.`;
      setCaption(line);
      speak(line);
      await wait(1900);
      const from = index;
      await tween(1400, (p) => setJourney(from + p));
      if (index + 1 >= waves.length) {
        setPhase("finale");
        const end = "You made it to morning!";
        setCaption(end);
        speak(end);
        await tween(1800, setParty);
      } else {
        setIndex(index + 1);
        setTyped("");
        setSpent(0);
        setPhase("plan");
        setMood("thinking");
        setCaption(ask);
      }
    } else if (darts < bugs) {
      await tween(900, setMarch);
      setMood("encouraging");
      const line = "Not enough darts. Some bugs reached your wall.";
      setCaption(line);
      speak(line);
      setPhase("missed");
    } else {
      setMood("encouraging");
      const line = "Too many darts! The extras smashed the greenhouse glass.";
      setCaption(line);
      speak(line);
      setPhase("missed");
    }
  };

  const retry = () => {
    setTyped("");
    setSpent(0);
    setMarch(0);
    setPhase("plan");
    setMood("thinking");
    setCaption(ask);
    speak(ask);
  };

  const scene = (
    <svg
      viewBox="0 0 960 440"
      style={{
        width: "100%",
        height: "100%",
        touchAction: "none",
        overflow: "hidden",
      }}
      role="img"
      aria-label={`Bugs in coloured parts: ${parts.map((part) => `${part.rows} × ${part.cols}`).join(", ")}. A greenhouse stands behind them.`}
    >
      <Night t={journey / waves.length} finale={party} />
      {finale ? (
        <g>
          <Scatter t={party} />
          <Greenhouse broken={0} />
        </g>
      ) : (
        <>
          <Greenhouse broken={panesBroken(extra, bugs)} />
          {/* The wall and one tower to a lane. */}
          <rect
            x={towerX - 28}
            y={area.y}
            width={18}
            height={area.h}
            rx={6}
            fill={march > 0 ? palette.ember[6] : palette.ink[3]}
          />
          {Array.from({ length: lanes }, (_, r) => (
            <rect
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed towers
              key={r}
              x={towerX}
              y={gridTop + r * cell}
              width={Math.max(size, 26)}
              height={size}
              rx={Math.min(4, size / 3)}
              fill={palette.sky[4]}
            />
          ))}
          {/* The darts in flight, one streak a lane. */}
          {firing &&
            Array.from({ length: Math.min(lanes, 16) }, (_, i) => {
              const r = Math.floor((i * lanes) / Math.min(lanes, 16));
              const y = gridTop + (r + 0.4) * cell;
              return (
                <line
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed streaks
                  key={i}
                  x1={towerX + 28}
                  x2={targetX}
                  y1={y}
                  y2={y}
                  stroke={palette.sunshine[5]}
                  strokeWidth={3}
                  strokeDasharray="14 22"
                  strokeDashoffset={-spent * 9}
                />
              );
            })}
          {/* What's left of each part, and its label. */}
          {drawn.map(({ part, d }) => (
            <path key={`${part.row}-${part.col}`} d={d} fill={part.tone} />
          ))}
          {drawn.map(({ part, left }) => {
            const x = area.x + (part.col + part.cols / 2) * cell - shift;
            const y = gridTop + (part.row + part.rows / 2) * cell;
            const text = `${part.rows} × ${part.cols}`;
            const width = text.length * 13 + 16;
            return (
              <g
                key={`label-${part.row}-${part.col}`}
                opacity={left === 0 ? 0.35 : 1}
                pointerEvents="none"
              >
                <rect
                  x={x - width / 2}
                  y={y - 16}
                  width={width}
                  height={32}
                  rx={8}
                  fill="white"
                  stroke={part.tone}
                  strokeWidth={3}
                />
                <text
                  x={x}
                  y={y + 7}
                  textAnchor="middle"
                  fontSize={20}
                  fontWeight={800}
                  fill={palette.ink[9]}
                >
                  {text}
                </text>
              </g>
            );
          })}
        </>
      )}
    </svg>
  );

  return (
    <Stage
      avatar={<Avatar expression={finale ? "cheering" : mood} size={60} />}
      caption={caption}
      progress={`Wave ${Math.min(index + 1, waves.length)} of ${waves.length}`}
      scene={scene}
      side={
        finale ? null : (
          <>
            <div
              data-darts
              style={{
                minHeight: 60,
                fontSize: 36,
                fontWeight: 800,
                textAlign: "center",
                borderRadius: 12,
                border: `3px solid ${palette.sky[6]}`,
                background: "white",
                color: palette.ink[9],
                lineHeight: "54px",
              }}
            >
              {phase === "plan" || !typed
                ? typed || "?"
                : fmt(Math.max(0, darts - spent), 0)}{" "}
              <span style={{ fontSize: 18 }}>darts</span>
            </div>
            <NumberPad
              value={typed}
              onChange={setTyped}
              dp={0}
              maxDigits={4}
              disabled={phase !== "plan"}
            />
            {phase === "missed" ? (
              <BigButton onClick={retry}>Try again</BigButton>
            ) : (
              <BigButton onClick={go} disabled={!typed || phase !== "plan"}>
                Fire!
              </BigButton>
            )}
          </>
        )
      }
    />
  );
}
