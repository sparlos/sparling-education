// Cargo Line: plan, then watch. A freight train runs a line: it leaves the
// depot with a load, picks up or drops off cargo at each stop, and must reach
// the city with what the city's sign says. One number on the line is missing
// (what it leaves with, what a stop moves, or what reaches the city); type
// it, then run the train. Rough prototype; see ../README.md.
import { palette } from "@repo/tokens";
import { useEffect, useRef, useState } from "react";
import {
  amount,
  BigButton,
  fmt,
  type Kind,
  kindFor,
  NumberPad,
  Stage,
  toUnits,
  wait,
} from "../add-sub-kit.tsx";
import { type Notebook, NotebookPiece } from "../notebook-kit.tsx";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  title: "Cargo Line",
  pitch:
    "A freight train's route: the depot, a stop or two that load or unload cargo, and the city. One number is missing: what the train leaves with, what a stop moves, or what reaches the city. Type it, run the train, and watch its load change at every stop.",
  expectations: ["math-2020.g3.B2.5", "math-2020.g4.B2.4", "math-2020.g5.B2.4"],
  misconceptions: [
    {
      id: "runs-the-story-forward",
      fails:
        'The start is missing and the farm unloads 136, with 251 needed at the city. Subtracting (251 − 136 = 115) because the story says "unload": the train leaves with 115 and either stalls at the farm, with too little to unload, or reaches the city with 21 under the sign\'s 251.',
    },
    {
      id: "adds-the-numbers-shown",
      fails:
        "The farm's amount is missing: the train leaves with 452 and must reach the city with 315. Typing 452 + 315 = 767 for the farm to unload: the train has only 452, so it stalls at the farm.",
    },
    {
      id: "lines-up-digits-not-units",
      fails:
        "At Grade 5, 2.18 tonnes on board and 0.4 unloaded, worked out as 2.14: the city's sign says 2.14, and the train rolls in with 1.78.",
    },
  ],
  sampleTask:
    "math-2020.g3.B2.5's change situations where the start, the change or the result is unknown (taking 58 away from 867, the unknown part of 600), and math-2020.g4.B2.4's sample task of problems with the start, change or total unknown. math-2020.g5.B2.4's 9.31 − 6.8 for decimals.",
  fun: "Railbound and Train Valley's loop: set up the line, press go, and watch the train run it. Each stop is a little reveal as the load ticks up or down, and the city's gate is the payoff, or the train stalls at the stop where the plan went wrong.",
};

const jobsPerRound = 6;
const placeNames = ["farm", "mill"];
type Unknown = "start" | "change" | "end";
type Mood = "thinking" | "happy" | "encouraging" | "cheering";

interface Stop {
  name: string;
  load: boolean;
  amount: number;
}

export interface Job {
  kind: Kind;
  start: number;
  stops: Stop[];
  end: number;
  unknown: Unknown;
  /** Which stop's amount is missing, when the change is. */
  at: number;
}

function makeJob(grade: number, round: number): Job {
  const kind = kindFor(grade, round);
  const n = grade <= 3 ? 1 : 2;
  const unknown = (["end", "change", "start"] as const)[round % 3] ?? "end";
  const M = kind.max;
  for (;;) {
    const start = amount(kind, M * 0.25, M * 0.6);
    if (start === null) continue;
    let cur = start;
    const stops: Stop[] = [];
    for (let i = 0; i < n; i++) {
      // When the start is missing, the first stop unloads, so working the
      // story forward shows.
      const load = unknown === "start" && i === 0 ? false : Math.random() < 0.5;
      const a = load
        ? amount(kind, M * 0.05, Math.min(M - cur, M * 0.4))
        : amount(kind, M * 0.05, Math.min(cur * 0.85, M * 0.4));
      if (a === null) break;
      cur += load ? a : -a;
      stops.push({ name: placeNames[i] ?? "stop", load, amount: a });
    }
    if (stops.length < n || cur <= 0 || cur > M) continue;
    return {
      kind,
      start,
      stops,
      end: cur,
      unknown,
      at: n === 1 ? 0 : rand01(),
    };
  }
}

const rand01 = () => (Math.random() < 0.5 ? 0 : 1);

function story(job: Job): string {
  const u = job.kind.dp ? "tonnes" : "crates";
  const v = (n: number) => `${fmt(n, job.kind.dp)} ${u}`;
  const lines = [
    job.unknown === "start"
      ? `The train leaves with some ${u}.`
      : `The train leaves with ${v(job.start)}.`,
  ];
  job.stops.forEach((s, i) => {
    const verb = s.load ? "picks up" : "drops off";
    lines.push(
      job.unknown === "change" && job.at === i
        ? `It ${verb} some at the ${s.name}.`
        : `It ${verb} ${v(s.amount)} at the ${s.name}.`,
    );
  });
  if (job.unknown === "end")
    lines.push(`How many ${u} will reach the city? Set the city's sign.`);
  else {
    lines.push(`It must reach the city with ${v(job.end)}.`);
    const missing = job.stops[job.at];
    lines.push(
      job.unknown === "start"
        ? "How many should it leave with?"
        : `How many does it ${missing?.load ? "pick up" : "drop off"} at the ${missing?.name}?`,
    );
  }
  return lines.join(" ");
}

interface Outcome {
  ok: boolean;
  /** The stop where the train couldn't unload, if it stalled. */
  stall?: number;
  arrived?: number;
}

const depotX = 90;
const gateX = 860;
const trackY = 300;
const stopXs = (n: number) => (n === 1 ? [475] : [345, 605]);

/** The notebook's small picture of a job: the route's signs, in a strip. */
function RouteStrip({ job }: { job: Job }) {
  const dp = job.kind.dp;
  const signs = [
    {
      title: "leaves with",
      value: job.unknown === "start" ? "?" : fmt(job.start, dp),
    },
    ...job.stops.map((s, i) => ({
      title: s.load ? "▲ load" : "▼ unload",
      value: job.unknown === "change" && job.at === i ? "?" : fmt(s.amount, dp),
    })),
    {
      title: "city needs",
      value: job.unknown === "end" ? "?" : fmt(job.end, dp),
    },
  ];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {signs.map((s) => {
        const sign = (
          <div
            key={s.title}
            style={{
              padding: "2px 8px",
              minWidth: 72,
              textAlign: "center",
              borderRadius: 8,
              background: "white",
              border: `2px solid ${palette.ink[4]}`,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700 }}>{s.title}</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{s.value}</div>
          </div>
        );
        // The whole sign is the handle; only its number lands on the page.
        return s.value === "?" ? (
          <div key={s.title}>{sign}</div>
        ) : (
          <NotebookPiece key={s.title} digits={s.value}>
            {sign}
          </NotebookPiece>
        );
      })}
    </div>
  );
}

export default function CargoLine({
  grade,
  Avatar,
  speak,
  notebook,
  firstJob,
}: PrototypeProps & { notebook?: Notebook; firstJob?: Job }) {
  const [round, setRound] = useState(0);
  const [job, setJob] = useState(() => firstJob ?? makeJob(grade, 0));
  const [entry, setEntry] = useState("");
  const [trainX, setTrainX] = useState(depotX);
  const [cargo, setCargo] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [mood, setMood] = useState<Mood>("thinking");
  const alive = useRef(true);
  const dp = job.kind.dp;
  const xs = stopXs(job.stops.length);
  const done = outcome?.ok && round >= jobsPerRound - 1;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    setEntry("");
    setTrainX(depotX);
    setCargo(null);
    setOutcome(null);
    notebook?.task(job, <RouteStrip job={job} />);
    speak(
      round === 0
        ? `${story(job)} Type the missing number, then press Go.`
        : story(job),
    );
  }, [job, round, speak, notebook]);

  const edit = (value: string) => {
    setEntry(value);
    if (outcome && !outcome.ok) {
      setOutcome(null);
      setTrainX(depotX);
      setCargo(null);
      setMood("thinking");
    }
  };

  const tick = async (from: number, to: number) => {
    for (let k = 1; k <= 12; k++) {
      setCargo(Math.round(from + ((to - from) * k) / 12));
      await wait(55);
    }
  };

  const run = async () => {
    const typed = toUnits(entry, dp);
    if (typed === null || running) return;
    notebook?.close();
    setRunning(true);
    setOutcome(null);
    setTrainX(depotX);
    let cur = job.unknown === "start" ? typed : job.start;
    setCargo(cur);
    await wait(500);
    const u = dp ? "tonnes" : "crates";
    for (const [i, s] of job.stops.entries()) {
      const moved = job.unknown === "change" && job.at === i ? typed : s.amount;
      setTrainX(xs[i] ?? 0);
      await wait(1300);
      if (!alive.current) return;
      if (!s.load && moved > cur) {
        setRunning(false);
        setOutcome({ ok: false, stall: i });
        setMood("encouraging");
        speak(
          `The train only has ${fmt(cur, dp)} ${u}. It can't drop off ${fmt(moved, dp)} at the ${s.name}.`,
        );
        return;
      }
      const next = s.load ? cur + moved : cur - moved;
      await tick(cur, next);
      cur = next;
      await wait(250);
    }
    setTrainX(gateX - 150);
    await wait(1300);
    if (!alive.current) return;
    const need = job.unknown === "end" ? typed : job.end;
    const ok = cur === need;
    setRunning(false);
    setOutcome({ ok, arrived: cur });
    setMood(ok ? "cheering" : "encouraging");
    if (ok) setTrainX(gateX + 40);
    speak(
      ok
        ? round >= jobsPerRound - 1
          ? `${fmt(cur, dp)} ${u}! The gate opens. Every delivery is done!`
          : `${fmt(cur, dp)} ${u}! The gate opens.`
        : job.unknown === "end"
          ? `The train brought ${cur > need ? "more" : "fewer"} ${u} than the city's sign says.`
          : `The train brought ${fmt(cur, dp)} ${u}. The city's sign says ${fmt(need, dp)}.`,
    );
  };

  const next = () => {
    const r = done ? 0 : round + 1;
    setRound(r);
    setMood("thinking");
    setJob(makeJob(grade, r));
  };

  const shown = (known: number, isMissing: boolean) =>
    isMissing ? entry || "?" : fmt(known, dp);

  const sign = (
    x: number,
    title: string,
    value: string,
    color: string,
    missing: boolean,
    bad: boolean,
  ) => (
    <g>
      <line
        x1={x}
        x2={x}
        y1={210}
        y2={trackY - 10}
        stroke={palette.ink[5]}
        strokeWidth={5}
      />
      <rect
        x={x - 80}
        y={110}
        width={160}
        height={100}
        rx={14}
        fill={bad ? palette.ember[1] : missing ? palette.sky[0] : "white"}
        stroke={bad ? palette.ember[6] : missing ? palette.sky[6] : color}
        strokeWidth={missing || bad ? 6 : 4}
        strokeDasharray={missing && value === "?" ? "10 7" : undefined}
      />
      <text
        x={x}
        y={142}
        textAnchor="middle"
        fontSize={22}
        fontWeight={800}
        fill={color}
      >
        {title}
      </text>
      <text
        x={x}
        y={190}
        textAnchor="middle"
        fontSize={value.length > 6 ? 32 : 40}
        fontWeight={900}
        fill={palette.ink[9]}
      >
        {value}
      </text>
    </g>
  );

  const fill =
    cargo === null ? 0 : Math.max(0, Math.min(1, cargo / job.kind.max));

  const scene = (
    <svg
      viewBox="0 0 960 420"
      style={{ width: "100%", height: "100%", userSelect: "none" }}
      role="img"
      aria-label="A train line from the depot to the city"
    >
      <rect
        x={0}
        y={trackY + 14}
        width={960}
        height={110}
        fill={palette.leaf[1]}
      />
      {/* Track */}
      <line
        x1={30}
        x2={940}
        y1={trackY + 8}
        y2={trackY + 8}
        stroke={palette.ink[6]}
        strokeWidth={6}
      />
      {Array.from({ length: 46 }, (_, i) => (
        <rect
          // biome-ignore lint/suspicious/noArrayIndexKey: sleepers
          key={i}
          x={34 + i * 20}
          y={trackY + 4}
          width={8}
          height={18}
          fill={palette.ink[4]}
        />
      ))}
      {sign(
        depotX,
        "leaves with",
        shown(job.start, job.unknown === "start"),
        palette.ink[7],
        job.unknown === "start",
        false,
      )}
      {job.stops.map((s, i) => (
        <g key={s.name}>
          {sign(
            xs[i] ?? 0,
            `${s.load ? "▲ load" : "▼ unload"}`,
            shown(s.amount, job.unknown === "change" && job.at === i),
            s.load ? palette.leaf[7] : palette.ember[7],
            job.unknown === "change" && job.at === i,
            outcome?.stall === i,
          )}
          <text
            x={xs[i]}
            y={trackY + 60}
            textAnchor="middle"
            fontSize={20}
            fontWeight={700}
            fill={palette.ink[7]}
          >
            {s.name}
          </text>
        </g>
      ))}
      {sign(
        gateX,
        "city needs",
        shown(job.end, job.unknown === "end"),
        palette.berry[7],
        job.unknown === "end",
        !!outcome && !outcome.ok && outcome.stall === undefined,
      )}
      {/* Gate */}
      <rect
        x={gateX - 8}
        y={trackY - 70}
        width={16}
        height={78}
        fill={palette.ink[6]}
      />
      <rect
        x={gateX - 8}
        y={trackY - 66}
        width={16}
        height={66}
        fill={outcome?.ok ? palette.leaf[5] : palette.ember[5]}
        style={{
          transformOrigin: `${gateX}px ${trackY - 66}px`,
          transform: outcome?.ok ? "rotate(-80deg)" : "none",
          transition: "transform 500ms",
        }}
      />
      {/* Train */}
      <g
        style={{
          transform: `translateX(${trainX - 90}px)`,
          transition: "transform 1200ms ease-in-out",
        }}
      >
        <rect
          x={0}
          y={trackY - 92}
          width={150}
          height={88}
          rx={10}
          fill="white"
          stroke={palette.ink[7]}
          strokeWidth={4}
        />
        <rect
          x={6}
          y={trackY - 8 - 80 * fill}
          width={138}
          height={80 * fill}
          fill={palette.sunshine[3]}
        />
        <text
          x={75}
          y={trackY - 36}
          textAnchor="middle"
          fontSize={cargo !== null && fmt(cargo, dp).length > 5 ? 26 : 32}
          fontWeight={900}
          fill={palette.ink[9]}
        >
          {cargo === null
            ? ""
            : job.unknown === "end" && !outcome?.ok && trainX !== depotX
              ? "?"
              : fmt(cargo, dp)}
        </text>
        <rect
          x={156}
          y={trackY - 70}
          width={60}
          height={66}
          rx={8}
          fill={palette.sky[6]}
        />
        <rect
          x={190}
          y={trackY - 96}
          width={18}
          height={28}
          fill={palette.ink[7]}
        />
        {[24, 120, 186].map((cx) => (
          <circle key={cx} cx={cx} cy={trackY} r={11} fill={palette.ink[8]} />
        ))}
      </g>
    </svg>
  );

  const side = (
    <>
      <div
        style={{
          fontSize: 34,
          fontWeight: 900,
          textAlign: "center",
          padding: "6px 0",
          borderRadius: 12,
          border: `3px solid ${palette.sky[6]}`,
          background: "white",
          minHeight: 48,
        }}
      >
        {entry || " "}
      </div>
      <NumberPad
        value={entry}
        onChange={edit}
        dp={dp}
        maxDigits={String(job.kind.max).length}
        disabled={running || !!outcome?.ok}
      />
      {outcome?.ok ? (
        <BigButton tone="next" onClick={next}>
          {done ? "Play again" : "Next →"}
        </BigButton>
      ) : (
        <BigButton onClick={run} disabled={running || entry === ""}>
          {running ? "Running…" : "Go ▶"}
        </BigButton>
      )}
    </>
  );

  return (
    <Stage
      avatar={<Avatar expression={done ? "cheering" : mood} size={80} />}
      caption={story(job)}
      progress={`${Math.min(round + 1, jobsPerRound)} / ${jobsPerRound}`}
      scene={scene}
      side={side}
    />
  );
}
