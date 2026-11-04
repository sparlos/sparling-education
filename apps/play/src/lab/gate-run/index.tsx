// Gate Run: a crowd runner where the route is the multiplication. Tap one gate
// at each fork, press go, and watch a few runners burst into a big crowd that
// has to fill a stadium exactly. Rough prototype; see ../README.md.
import { palette } from "@repo/tokens";
import { useEffect, useMemo, useState } from "react";
import { BigButton, fmt, Stage, wait } from "../add-sub-kit.tsx";
import { Bursts, gridPath, JourneyStrip, tween } from "../mult-kit.tsx";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  title: "Gate Run",
  pitch:
    "A few runners, a stadium of 6 rows of 27 seats, and forks of gates: × 2, × 20 or × 30, then + 7, + 42 or + 67. Tap your route and watch the crowd burst through. The journey is six towns, each stadium bigger, ending in the Grand Stadium.",
  expectations: ["math-2020.g3.B2.6", "math-2020.g4.B2.5", "math-2020.g5.B2.6"],
  misconceptions: [
    {
      id: "adds-instead-of-multiplies",
      fails:
        "For 4 × 5, taking the + 5 gate: 9 runners reach a stadium of 20 seats, and 11 seats stay empty.",
    },
    {
      id: "forgets-to-multiply-the-ones",
      fails:
        "For 6 × 27, taking × 20 then + 7, as if 6 × 27 were 120 + 7: 127 runners arrive, and 35 seats stay empty.",
    },
    {
      id: "tens-digit-as-ones",
      fails:
        "For 6 × 27, taking × 2 then + 42, reading the 2 in 27 as 2 and not 20: only 54 runners arrive, and most of the stadium stays empty.",
    },
    {
      id: "drops-a-partial-product",
      fails:
        "For 23 × 17, taking × 10 then + 21, multiplying only the 3 by the 7: 251 runners reach 391 seats, and 140 stay empty.",
    },
  ],
  sampleTask:
    "math-2020.g4.B2.5, sample task 1: splitting 27 × 6 into (6 × 20) + (6 × 7) on an open array. math-2020.g3.B2.6, sample task 1: 6 rows of 9 split up using known facts, including 6 × 10 − 6 × 1. math-2020.g5.B2.6, sample task 1: the orchard, 78 × 65.",
  fun: "Count Masters and Mob Control's hook: a few runners go through a gate and a huge crowd bursts out. Here it's plan-then-watch, like Fraction Hop and Cargo Line. The gates are already there, so there are no block sizes to work out.",
  isArchived: true,
};

type Op = "×" | "+" | "−";
interface Gate {
  op: Op;
  n: number;
}
interface Task {
  a: number;
  b: number;
  forks: Gate[][];
}

const g = (text: string): Gate => {
  const op = text[0] as Op;
  return { op, n: Number(text.slice(1)) };
};
const t = (a: number, b: number, ...forks: string[][]): Task => ({
  a,
  b,
  forks: forks.map((fork) => fork.map(g)),
});

const byGrade: Record<number, Task[]> = {
  // A bigger wrong gate at every fork, so "always take the biggest" fails.
  3: [
    t(4, 5, ["×5", "+5", "×10"]),
    t(3, 10, ["+10", "×10", "×20"]),
    t(6, 7, ["×5", "+5", "×10"], ["+2", "+12", "+30"]),
    t(4, 6, ["×2", "×5", "×10"], ["+4", "+1", "+10"]),
    t(6, 9, ["×5", "×10"], ["−1", "−6", "+6"]),
    t(7, 8, ["×10", "×5"], ["+21", "+3", "+35"]),
  ],
  4: [
    t(8, 100, ["+100", "×100", "×1000"]),
    t(3, 14, ["×10", "+10", "×20"], ["+4", "+12", "+30"]),
    t(6, 27, ["×2", "×20", "×30"], ["+7", "+42", "+67"]),
    t(8, 21, ["×20", "×2", "×30"], ["+1", "+8", "+80"]),
    t(
      4,
      135,
      ["×1", "×100", "×200"],
      ["+30", "+120", "+300"],
      ["+5", "+20", "+50"],
    ),
    t(
      7,
      246,
      ["×200", "×2", "×300"],
      ["+40", "+280", "+400"],
      ["+42", "+6", "+60"],
    ),
  ],
  5: [
    t(12, 15, ["×1", "×10", "×20"], ["+5", "+60", "+90"]),
    t(14, 13, ["×10", "×3", "×30"], ["+3", "+42", "+90"]),
    t(23, 17, ["×7", "×10", "×20"], ["+21", "+161", "+210"]),
    t(24, 38, ["×3", "×30", "×40"], ["+32", "+192", "+240"]),
    t(
      78,
      65,
      ["×60", "×6", "×70"],
      ["+35", "+350", "+500"],
      ["+40", "+4", "+50"],
    ),
    t(
      46,
      52,
      ["×5", "×50", "×60"],
      ["+80", "+8", "+100"],
      ["+2", "+12", "+20"],
    ),
  ],
};

export const apply = (value: number, gate: Gate) =>
  gate.op === "×"
    ? value * gate.n
    : gate.op === "+"
      ? value + gate.n
      : value - gate.n;

const tasksFor = (grade: number) =>
  byGrade[Math.min(5, Math.max(3, grade))] ?? [];

// The picture, 960 × 440.
const start = { x: 70, y: 250 };
const door = { x: 600, y: 250 };
const stadium = { x: 600, y: 80, w: 340, h: 345 };
const forkXs = (n: number) =>
  n === 1 ? [335] : n === 2 ? [240, 450] : [180, 330, 480];
const optionY = (count: number, i: number) =>
  250 + (i - (count - 1) / 2) * (count === 3 ? 115 : 150);

const line = (gate: Gate) => `${gate.op} ${gate.n}`;

function Crowd({
  x,
  y,
  count,
  part,
}: {
  x: number;
  y: number;
  count: number;
  /** The runners go behind the gates; their number stays in front. */
  part: "runners" | "number";
}) {
  // One dot a runner up to 160: the number above it is always exact.
  const dots = Math.min(160, count);
  const d = Array.from({ length: dots }, (_, i) => {
    const r = Math.sqrt(i) * 5.2;
    const a = i * 2.39996;
    const cx = x + Math.cos(a) * r;
    const cy = y + Math.sin(a) * r;
    return `M${cx - 3} ${cy}a3 3 0 1 0 6 0a3 3 0 1 0 -6 0`;
  }).join("");
  const top = y - Math.sqrt(dots) * 5.2 - 22;
  return (
    <g pointerEvents="none">
      {part === "runners" && <path d={d} fill={palette.sky[7]} />}
      {part === "number" && (
        <>
          <rect
            x={x - 44}
            y={top - 24}
            width={88}
            height={38}
            rx={10}
            fill="white"
            stroke={palette.sky[7]}
            strokeWidth={3}
          />
          <text
            x={x}
            y={top + 4}
            textAnchor="middle"
            fontSize={26}
            fontWeight={800}
            fill={palette.ink[9]}
          >
            {fmt(count, 0)}
          </text>
        </>
      )}
    </g>
  );
}

type Phase = "plan" | "run" | "missed" | "finale";

export default function GateRun({ grade, Avatar, speak }: PrototypeProps) {
  const tasks = useMemo(() => tasksFor(grade), [grade]);
  const [index, setIndex] = useState(0);
  const [journey, setJourney] = useState(0);
  const [phase, setPhase] = useState<Phase>("plan");
  const [picked, setPicked] = useState<(number | null)[]>([]);
  const [crowd, setCrowd] = useState({ ...start, count: 0, shown: true });
  const [filled, setFilled] = useState(0);
  const [passed, setPassed] = useState<number[]>([]);
  const [caption, setCaption] = useState("");
  const [mood, setMood] = useState<"thinking" | "happy" | "encouraging">(
    "thinking",
  );
  const [party, setParty] = useState(0);
  const task = tasks[index];

  const ready = (next: number) => {
    const job = tasks[next];
    if (!job) return;
    setPicked(job.forks.map(() => null));
    setCrowd({ ...start, count: job.a, shown: true });
    setFilled(0);
    setPassed([]);
    setPhase("plan");
    setMood("thinking");
    setCaption("Pick a gate at each fork, so your runners fill every seat.");
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: start of a play
  useEffect(() => {
    ready(0);
    speak("Pick a gate at each fork, so your runners fill every seat.");
  }, [tasks]);

  if (!task) return null;

  const seats = task.a * task.b;
  const xs = forkXs(task.forks.length);
  const cell = Math.min(
    (stadium.w - 40) / task.b,
    (stadium.h - 120) / task.a,
    30,
  );
  const gridX = stadium.x + (stadium.w - cell * task.b) / 2;
  const gridY = stadium.y + 60;
  const chosen = task.forks.map((fork, i) => {
    const at = picked[i];
    return at === null || at === undefined ? null : (fork[at] ?? null);
  });
  const allPicked = chosen.every(Boolean);

  const go = async () => {
    if (!allPicked || phase !== "plan") return;
    setPhase("run");
    setCaption("Here they go!");
    const points = task.forks.map((fork, i) => ({
      x: xs[i] ?? 0,
      y: optionY(fork.length, picked[i] ?? 0),
    }));
    let value = task.a;
    let from: { x: number; y: number } = start;
    const trail: number[] = [];
    for (const [i, point] of points.entries()) {
      const a = from;
      await tween(650, (p) =>
        setCrowd({
          x: a.x + (point.x - a.x) * p,
          y: a.y + (point.y - a.y) * p,
          count: value,
          shown: true,
        }),
      );
      const before = value;
      const after = apply(value, chosen[i] as Gate);
      await tween(450, (p) =>
        setCrowd({
          ...point,
          count: Math.round(before + (after - before) * p),
          shown: true,
        }),
      );
      value = after;
      trail.push(value);
      setPassed([...trail]);
      from = point;
    }
    const a = from;
    await tween(600, (p) =>
      setCrowd({
        x: a.x + (door.x - a.x) * p,
        y: a.y + (door.y - a.y) * p,
        count: value,
        shown: true,
      }),
    );
    const goesIn = Math.min(value, seats);
    await tween(1100, (p) => {
      const n = Math.round(goesIn * p);
      setFilled(n);
      setCrowd({ ...door, count: value - n, shown: value - n > 0 });
    });
    if (value === seats) {
      setMood("happy");
      const line = `Every seat is full! ${task.a} times ${task.b} is ${seats}.`;
      setCaption(line);
      speak(line);
      await wait(1900);
      const from2 = index;
      await tween(600, (p) => setJourney(from2 + p));
      if (index + 1 >= tasks.length) {
        setPhase("finale");
        setCaption("The Grand Stadium is full!");
        speak("The Grand Stadium is full!");
        await tween(1800, setParty);
      } else {
        setIndex(index + 1);
        ready(index + 1);
      }
    } else {
      setMood("encouraging");
      const line =
        value < seats
          ? `${seats - value} seats are still empty. Your route made ${fmt(value, 0)} runners, and this stadium has ${fmt(seats, 0)} seats.`
          : `${value - seats} runners have no seat. Your route made ${fmt(value, 0)} runners, and this stadium has ${fmt(seats, 0)} seats.`;
      setCaption(line);
      speak(line);
      setPhase("missed");
    }
  };

  const retry = () => {
    setCrowd({ ...start, count: task.a, shown: true });
    setFilled(0);
    setPassed([]);
    setPhase("plan");
    setMood("thinking");
    setCaption("Try another route.");
    speak("Try another route.");
  };

  const pick = (fork: number, option: number) => {
    if (phase !== "plan") return;
    setPicked(picked.map((p, i) => (i === fork ? option : p)));
  };

  const finale = phase === "finale";
  const action =
    phase === "missed" ? (
      <BigButton onClick={retry}>Try again</BigButton>
    ) : finale ? null : (
      <BigButton onClick={go} disabled={!allPicked || phase !== "plan"}>
        Go!
      </BigButton>
    );

  return (
    <Stage
      avatar={<Avatar expression={finale ? "cheering" : mood} size={60} />}
      caption={caption}
      progress={`Town ${Math.min(index + 1, tasks.length)} of ${tasks.length}`}
      action={action}
      scene={
        <svg
          viewBox="0 0 960 440"
          style={{ width: "100%", height: "100%", touchAction: "none" }}
          role="img"
          aria-label="Runners, gates and a stadium"
        >
          <rect width={960} height={440} fill={palette.leaf[1]} rx={12} />
          <JourneyStrip at={journey} total={tasks.length} finished={finale} />
          {finale ? (
            <g>
              <rect
                x={180}
                y={70}
                width={600}
                height={350}
                rx={30}
                fill={palette.ink[7]}
              />
              <path
                d={gridPath(16, 30, 210, 100, 18)}
                fill={palette.sky[5]}
                opacity={0.25 + 0.75 * party}
              />
              <Bursts t={party} />
            </g>
          ) : (
            <>
              {/* Every road, the picked ones bold. */}
              {task.forks.map((fork, i) => {
                const prevAt = i === 0 ? null : picked[i - 1];
                const prev =
                  i === 0
                    ? start
                    : prevAt === null || prevAt === undefined
                      ? null
                      : {
                          x: xs[i - 1] ?? 0,
                          y: optionY(task.forks[i - 1]?.length ?? 0, prevAt),
                        };
                return fork.map((_, o) => {
                  const y = optionY(fork.length, o);
                  const bold = picked[i] === o && prev;
                  return prev ? (
                    <line
                      // biome-ignore lint/suspicious/noArrayIndexKey: fixed roads
                      key={`${i}-${o}`}
                      x1={prev.x}
                      y1={prev.y}
                      x2={xs[i]}
                      y2={y}
                      stroke={bold ? palette.sky[6] : palette.ink[3]}
                      strokeWidth={bold ? 12 : 5}
                      strokeLinecap="round"
                    />
                  ) : null;
                });
              })}
              {picked.at(-1) !== null && picked.at(-1) !== undefined && (
                <line
                  x1={xs.at(-1)}
                  y1={optionY(
                    task.forks.at(-1)?.length ?? 0,
                    picked.at(-1) ?? 0,
                  )}
                  x2={door.x}
                  y2={door.y}
                  stroke={palette.sky[6]}
                  strokeWidth={12}
                  strokeLinecap="round"
                />
              )}
              {/* The stadium: a seat for every runner it wants. */}
              <rect
                x={stadium.x}
                y={stadium.y}
                width={stadium.w}
                height={stadium.h}
                rx={22}
                fill={palette.ink[7]}
              />
              <text
                x={stadium.x + stadium.w / 2}
                y={stadium.y + 44}
                textAnchor="middle"
                fontSize={34}
                fontWeight={800}
                fill="white"
              >
                {task.a} × {task.b}
              </text>
              <path
                d={gridPath(task.a, task.b, gridX, gridY, cell)}
                fill={palette.ink[4]}
              />
              <path
                d={gridPath(task.a, task.b, gridX, gridY, cell, 0, filled)}
                fill={palette.sunshine[4]}
              />
              <text
                x={stadium.x + stadium.w / 2}
                y={stadium.y + stadium.h - 16}
                textAnchor="middle"
                fontSize={20}
                fontWeight={700}
                fill="white"
              >
                {task.a} rows of {task.b} seats
              </text>
              {crowd.shown && (
                <Crowd
                  x={crowd.x}
                  y={crowd.y}
                  count={crowd.count}
                  part="runners"
                />
              )}
              {/* The gates. */}
              {task.forks.map((fork, i) =>
                fork.map((gate, o) => {
                  const x = xs[i] ?? 0;
                  const y = optionY(fork.length, o);
                  const on = picked[i] === o;
                  return (
                    // biome-ignore lint/a11y/useSemanticElements: a rough SVG gate
                    <g
                      // biome-ignore lint/suspicious/noArrayIndexKey: fixed gates
                      key={`g-${i}-${o}`}
                      onPointerDown={() => pick(i, o)}
                      style={{ cursor: "pointer" }}
                      role="button"
                      aria-label={`Gate ${line(gate)}`}
                      aria-pressed={on}
                    >
                      <rect
                        x={x - 54}
                        y={y - 44}
                        width={108}
                        height={88}
                        rx={14}
                        fill={on ? palette.sky[6] : "white"}
                        stroke={on ? palette.sky[8] : palette.ink[5]}
                        strokeWidth={4}
                      />
                      <text
                        x={x}
                        y={on && passed[i] !== undefined ? y - 4 : y + 12}
                        textAnchor="middle"
                        fontSize={32}
                        fontWeight={800}
                        fill={on ? "white" : palette.ink[9]}
                      >
                        {line(gate)}
                      </text>
                      {on && passed[i] !== undefined && (
                        <text
                          x={x}
                          y={y + 28}
                          textAnchor="middle"
                          fontSize={22}
                          fontWeight={800}
                          fill="white"
                        >
                          = {fmt(passed[i] ?? 0, 0)}
                        </text>
                      )}
                    </g>
                  );
                }),
              )}
              {crowd.shown && (
                <Crowd
                  x={crowd.x}
                  y={crowd.y}
                  count={crowd.count}
                  part="number"
                />
              )}
            </>
          )}
        </svg>
      }
    />
  );
}
