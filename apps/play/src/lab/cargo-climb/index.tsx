// Cargo Climb: Cargo Line from the side, as one journey up a mountain. The
// play opens on the whole mountain with a tiny train in the valley, then zooms
// in on one stretch: a sloped track, a stop or two, and a shut gate. Each right
// answer opens a gate; the camera pulls back, the tiny train climbs, and it
// zooms in again. The sixth gate leads to the summit. Rough prototype; see
// ../README.md.
import { palette } from "@repo/tokens";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BigButton,
  fmt,
  NumberPad,
  Stage,
  toUnits,
  wait,
} from "../add-sub-kit.tsx";
import { type Job, makeJob } from "../cargo-line/index.tsx";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  title: "Cargo Climb",
  pitch:
    "Cargo Line from the side, as one climb up a mountain. Start on the whole mountain with a tiny train, zoom in on a stretch of track, type the missing number and run the train. Each right answer opens a gate on the way to the summit.",
  expectations: ["math-2020.g3.B2.5", "math-2020.g4.B2.4", "math-2020.g5.B2.4"],
  misconceptions: [
    {
      id: "undoes-the-trip-wrong-way",
      fails:
        "The start is missing, the sawmill takes 136 and the gate's sign says 251. Typing 251 − 136 = 115: the train stalls at the sawmill with too little to drop off, then rolls back down the hill.",
    },
    {
      id: "adds-the-amounts-given",
      fails:
        "The farm's amount is missing: the train leaves with 452 and must arrive with 315. Typing 452 + 315 = 767 for the farm to take: the train only has 452, so it stalls at the farm.",
    },
  ],
  sampleTask:
    "math-2020.g3.B2.5's change situations where the start, the change or the result is unknown, and math-2020.g4.B2.4's sample task of problems with the start, change or total unknown.",
  fun: "The same plan-then-watch loop as Cargo Line, with a journey around it: the gates opening one by one and the train getting higher are a reason to keep going, and the summit is a finish line.",
  isArchived: true,
};

const tripsPerClimb = 6;
const unitOf = (job: Job) => (job.kind.dp ? "tonnes" : "crates");

// The three parts of the mountain, two trips each.
const parts = [
  {
    stops: ["farm", "windmill"],
    sky: palette.sky[1],
    hills: palette.leaf[2],
    ground: palette.leaf[4],
  },
  {
    stops: ["sawmill", "cabin"],
    sky: palette.sky[2],
    hills: palette.leaf[6],
    ground: palette.leaf[7],
  },
  {
    stops: ["quarry", "mine"],
    sky: palette.ink[1],
    hills: palette.ink[3],
    ground: palette.ink[5],
  },
] as const;
const partOf = (trip: number) => parts[Math.floor(trip / 2)] ?? parts[0];

function makeClimb(grade: number): Job[] {
  return Array.from({ length: tripsPerClimb }, (_, trip) => {
    const job = makeJob(grade, trip);
    const names = partOf(trip).stops;
    return {
      ...job,
      stops: job.stops.map((stop, i) => ({
        ...stop,
        // A one-stop trip uses each of its part's stops in turn.
        name:
          job.stops.length === 1 ? (names[trip % 2] ?? "") : (names[i] ?? ""),
      })),
    };
  });
}

function story(job: Job): string {
  const u = unitOf(job);
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
  if (job.unknown === "end") lines.push(`How many ${u} will it arrive with?`);
  else {
    lines.push(`It must arrive with ${v(job.end)}.`);
    const missing = job.stops[job.at];
    lines.push(
      job.unknown === "start"
        ? "How many should it leave with?"
        : `How many does it ${missing?.load ? "pick up" : "drop off"} there?`,
    );
  }
  return lines.join(" ");
}

// ---- The mountain, in the outer picture's coordinates ----

const viewW = 960;
const viewH = 480;
/** A stretch is drawn this small on the mountain, so zooming in is a real zoom. */
const stretchScale = 0.12;
const valley = { x: 90, y: 455 };
const gates = [
  { x: 230, y: 410 },
  { x: 370, y: 340 },
  { x: 490, y: 285 },
  { x: 600, y: 220 },
  { x: 700, y: 150 },
  { x: 775, y: 80 },
];
const summit = { x: 800, y: 34 };

// ---- One stretch, in its own 960 × 480 picture ----

const slope = 0.22;
const slopeDeg = (Math.atan(slope) * 180) / Math.PI;
const trackY = (x: number) => 400 - (x - 60) * slope;
const startSignX = 110;
const startX = 250;
const gateX = 840;
const atGateX = 790;
const pastGateX = 1160;
const stopXs = (n: number) => (n === 1 ? [510] : [400, 630]);
/** Where the train's nose stops so its wagon is under a sign. */
const noseAt = (signX: number) => signX + 135;

/** Where the camera stands to fill the screen with this trip's stretch. */
function stretchAt(trip: number) {
  const gate = gates[trip] ?? valley;
  return {
    x: gate.x - (gateX / viewW) * viewW * stretchScale,
    y: gate.y - trackY(gateX) * stretchScale,
  };
}

function Scenery({ trip }: { trip: number }) {
  const part = partOf(trip);
  const zone = Math.floor(trip / 2);
  // Scenery is fixed per trip, so it doesn't jump around between renders.
  const xs = [40, 170, 300, 440, 560, 700, 820, 930];
  return (
    <>
      <rect width={viewW} height={viewH} fill={part.sky} />
      <path
        d="M0 300 L150 170 L300 260 L470 110 L640 240 L800 60 L960 200 L960 480 L0 480 Z"
        fill={part.hills}
      />
      {zone === 2 && (
        <path
          d="M470 110 L430 146 L465 138 L500 150 L515 151 Z M800 60 L755 111 L800 96 L845 120 L860 115 Z"
          fill="white"
        />
      )}
      {zone === 1 &&
        xs.map((x, i) => {
          const y = trackY(x) - 24 - (i % 3) * 8;
          return (
            <polygon
              key={x}
              points={`${x - 26},${y} ${x + 26},${y} ${x},${y - 90}`}
              fill={palette.leaf[8]}
            />
          );
        })}
      {zone === 2 &&
        xs.map((x, i) => (
          <circle
            key={x}
            cx={x}
            cy={trackY(x) - 8}
            r={14 + (i % 3) * 8}
            fill={palette.ink[4]}
          />
        ))}
      {/* The hillside under the track. */}
      <polygon
        points={`0,${trackY(0) + 8} ${viewW},${trackY(viewW) + 8} ${viewW},${viewH} 0,${viewH}`}
        fill={part.ground}
      />
      {zone === 0 &&
        xs.map((x, i) => (
          <circle
            key={x}
            cx={x}
            cy={trackY(x) + 40 + (i % 3) * 18}
            r={5}
            fill={i % 2 ? palette.sunshine[4] : "white"}
          />
        ))}
      {/* Track, tilted with the hill. */}
      <line
        x1={0}
        y1={trackY(0) + 6}
        x2={viewW}
        y2={trackY(viewW) + 6}
        stroke={palette.ink[8]}
        strokeWidth={6}
      />
      {Array.from({ length: 34 }, (_, i) => {
        const x = 10 + i * 29;
        return (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: sleepers
            key={i}
            x={x - 4}
            y={trackY(x) + 2}
            width={8}
            height={14}
            fill={palette.ink[6]}
          />
        );
      })}
    </>
  );
}

function Sign({
  x,
  title,
  value,
  tone,
  missing,
  bad,
  checking,
}: {
  x: number;
  title: string;
  value: string;
  tone: string;
  missing: boolean;
  bad: boolean;
  checking?: boolean;
}) {
  const ground = trackY(x);
  const top = ground - 216;
  const stroke = bad
    ? palette.ember[6]
    : checking
      ? palette.sunshine[6]
      : missing
        ? palette.sky[6]
        : tone;
  return (
    <g>
      <line
        x1={x}
        x2={x}
        y1={top + 88}
        y2={ground}
        stroke={palette.ink[6]}
        strokeWidth={5}
      />
      <rect
        x={x - 78}
        y={top}
        width={156}
        height={88}
        rx={12}
        fill={bad ? palette.ember[1] : missing ? palette.sky[0] : "white"}
        stroke={stroke}
        strokeWidth={missing || bad || checking ? 6 : 4}
        strokeDasharray={missing && value === "?" ? "10 7" : undefined}
      />
      <text
        x={x}
        y={top + 28}
        textAnchor="middle"
        fontSize={20}
        fontWeight={800}
        fill={tone}
      >
        {title}
      </text>
      <text
        x={x}
        y={top + 72}
        textAnchor="middle"
        fontSize={value.length > 6 ? 30 : 38}
        fontWeight={900}
        fill={palette.ink[9]}
      >
        {value}
      </text>
    </g>
  );
}

function Train({
  x,
  ms,
  load,
  shaking,
}: {
  x: number;
  ms: number;
  load: string | null;
  shaking: boolean;
}) {
  return (
    <g
      style={{
        transform: `translate(${x}px, ${trackY(x)}px) rotate(${-slopeDeg}deg)`,
        transition: ms ? `transform ${ms}ms ease-in-out` : "none",
      }}
    >
      <g style={shaking ? { animation: "climb-shudder 180ms 4" } : undefined}>
        {/* Wagon */}
        <rect
          x={-210}
          y={-58}
          width={126}
          height={46}
          rx={6}
          fill="#a9743f"
          stroke={palette.ink[8]}
          strokeWidth={3}
        />
        {load !== null &&
          [-200, -166, -132].map((cx) => (
            <rect
              key={cx}
              x={cx}
              y={-84}
              width={30}
              height={26}
              fill={palette.sunshine[3]}
              stroke={palette.ink[7]}
              strokeWidth={2}
            />
          ))}
        {load !== null && (
          <text
            x={-147}
            y={-92}
            textAnchor="middle"
            fontSize={32}
            fontWeight={900}
            fill={palette.ink[9]}
            stroke="white"
            strokeWidth={5}
            paintOrder="stroke"
            transform={`rotate(${slopeDeg} -147 -92)`}
          >
            {load}
          </text>
        )}
        {/* Engine */}
        <rect
          x={-76}
          y={-58}
          width={76}
          height={46}
          rx={8}
          fill={palette.sky[6]}
          stroke={palette.ink[8]}
          strokeWidth={3}
        />
        <rect
          x={-72}
          y={-96}
          width={36}
          height={40}
          rx={4}
          fill={palette.sky[7]}
        />
        <rect x={-20} y={-84} width={14} height={28} fill={palette.ink[8]} />
        {[-186, -108, -52, -22].map((cx) => (
          <circle
            key={cx}
            cx={cx}
            cy={-6}
            r={11}
            fill={palette.ink[9]}
            stroke={palette.ink[5]}
            strokeWidth={3}
          />
        ))}
      </g>
    </g>
  );
}

function Gate({ open, instant }: { open: boolean; instant: boolean }) {
  const y = trackY(gateX);
  return (
    <g>
      <rect
        x={gateX - 8}
        y={y - 96}
        width={16}
        height={100}
        fill={palette.ink[7]}
      />
      <rect
        x={gateX - 7}
        y={y - 90}
        width={14}
        height={88}
        fill={open ? palette.leaf[5] : palette.ember[5]}
        style={{
          transformOrigin: `${gateX}px ${y - 90}px`,
          transform: open ? "rotate(-82deg)" : "none",
          transition: instant ? "none" : "transform 500ms",
        }}
      />
    </g>
  );
}

function Mountain({
  tiny,
  cleared,
  atTop,
}: {
  tiny: { x: number; y: number };
  cleared: number;
  atTop: boolean;
}) {
  const route = [valley, ...gates, summit]
    .map((p) => `${p.x},${p.y}`)
    .join(" ");
  const trees = [
    [420, 305],
    [470, 240],
    [540, 280],
    [560, 205],
    [620, 165],
    [650, 255],
    [440, 330],
    [700, 240],
  ] as const;
  return (
    <>
      <rect width={viewW} height={viewH} fill={palette.sky[1]} />
      <circle cx={130} cy={90} r={46} fill={palette.sunshine[2]} />
      <clipPath id="climb-mountain">
        <polygon points="40,480 800,20 960,240 960,480" />
      </clipPath>
      <g clipPath="url(#climb-mountain)">
        <rect width={viewW} height={viewH} fill={palette.leaf[4]} />
        <polygon points="0,214 960,214 960,334 0,334" fill={palette.leaf[7]} />
        <rect width={viewW} height={214} fill={palette.ink[5]} />
        <polygon
          points="700,0 960,0 960,150 860,90 800,112 740,86"
          fill="white"
        />
      </g>
      <rect y={viewH - 30} width={viewW} height={30} fill={palette.leaf[3]} />
      {trees.map(([x, y]) => (
        <polygon
          key={x}
          points={`${x - 9},${y} ${x + 9},${y} ${x},${y - 26}`}
          fill={palette.leaf[9]}
        />
      ))}
      <polyline
        points={route}
        fill="none"
        stroke={palette.ink[8]}
        strokeWidth={3}
        strokeDasharray="6 4"
      />
      {gates.map((g, i) => (
        <g key={g.x}>
          <rect
            x={g.x - 2}
            y={g.y - 15}
            width={4}
            height={15}
            fill={palette.ink[9]}
          />
          <circle
            cx={g.x}
            cy={g.y - 17}
            r={6}
            fill={i < cleared ? palette.leaf[5] : palette.ember[5]}
            stroke="white"
            strokeWidth={1.5}
          />
        </g>
      ))}
      {/* The summit's flag. */}
      <line
        x1={summit.x}
        x2={summit.x}
        y1={summit.y}
        y2={summit.y - 26}
        stroke={palette.ink[9]}
        strokeWidth={3}
      />
      <polygon
        points={`${summit.x},${summit.y - 26} ${summit.x + 24},${summit.y - 19} ${summit.x},${summit.y - 12}`}
        fill={atTop ? palette.leaf[5] : palette.berry[6]}
      />
      {/* The tiny train. */}
      <g
        style={{
          transform: `translate(${tiny.x}px, ${tiny.y}px)`,
          transition: "transform 1400ms ease-in-out",
        }}
      >
        <rect x={-15} y={-9} width={15} height={8} fill="#a9743f" />
        <rect x={1} y={-11} width={11} height={10} fill={palette.sky[6]} />
      </g>
    </>
  );
}

type Outcome =
  | { kind: "stall"; stop: number }
  | { kind: "wrong" }
  | { kind: "open" };
type Mood = "neutral" | "thinking" | "happy" | "encouraging" | "cheering";

export default function CargoClimb({ grade, Avatar, speak }: PrototypeProps) {
  const [jobs, setJobs] = useState(() => makeClimb(grade));
  const [trip, setTrip] = useState(0);
  // null shows the whole mountain; a number stands close on that trip's stretch.
  const [camera, setCamera] = useState<number | null>(null);
  const [instant, setInstant] = useState(false);
  // False from the moment the camera starts moving until it's standing still.
  const [settled, setSettled] = useState(false);
  const [tiny, setTiny] = useState(valley);
  const [cleared, setCleared] = useState(0);
  const [atTop, setAtTop] = useState(false);
  const [entry, setEntry] = useState("");
  const [x, setX] = useState(startX);
  const [ms, setMs] = useState(0);
  const [cargo, setCargo] = useState<number | null>(null);
  const [moment, setMoment] = useState<{ x: number; text: string } | null>(
    null,
  );
  const [running, setRunning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [mood, setMood] = useState<Mood>("neutral");
  const [caption, setCaption] = useState("");
  const alive = useRef(true);
  const started = useRef(false);
  const skipped = useRef(false);
  const cutShort = useRef<(() => void) | null>(null);
  const job = jobs[trip] ?? jobs[0];

  /** A pause the skip button can end, along with any pause after it in the same climb. */
  const beat = useCallback(
    (duration: number) =>
      skipped.current
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            const timer = window.setTimeout(resolve, duration);
            cutShort.current = () => {
              window.clearTimeout(timer);
              resolve();
            };
          }),
    [],
  );

  const skip = () => {
    skipped.current = true;
    setInstant(true);
    cutShort.current?.();
  };

  const say = useCallback(
    (line: string) => {
      setCaption(line);
      speak(line);
    },
    [speak],
  );

  /** Pulls back, climbs the tiny train to the next stretch, and zooms in on it. */
  const climbTo = useCallback(
    async (next: number, nextJobs: readonly Job[]) => {
      setSettled(false);
      setCamera(null);
      await beat(1000);
      const from = next === 0 ? valley : (gates[next - 1] ?? valley);
      const to = gates[next] ?? valley;
      setTiny({
        x: from.x + (to.x - from.x) * 0.45,
        y: from.y + (to.y - from.y) * 0.45,
      });
      await beat(1400);
      setTrip(next);
      setEntry("");
      setX(startX);
      setMs(0);
      setCargo(null);
      setOutcome(null);
      setMoment(null);
      setCamera(next);
      await beat(1300);
      // Lets a skipped climb paint its jump before transitions come back.
      if (skipped.current) await wait(50);
      if (!alive.current) return;
      setInstant(false);
      setSettled(true);
      setMood("thinking");
      const nextJob = nextJobs[next];
      if (nextJob) say(story(nextJob));
    },
    [beat, say],
  );

  const open = useCallback(
    async (nextJobs: readonly Job[]) => {
      skipped.current = false;
      setInstant(false);
      setSettled(false);
      say("Let's get this train to the top of the mountain.");
      await beat(3200);
      if (!alive.current) return;
      await climbTo(0, nextJobs);
    },
    [beat, climbTo, say],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: once, as the prototype opens
  useEffect(() => {
    alive.current = true;
    if (!started.current) {
      started.current = true;
      void open(jobs);
    }
    return () => {
      alive.current = false;
    };
  }, []);

  if (!job) return null;
  const dp = job.kind.dp;
  const xs = stopXs(job.stops.length);
  const u = unitOf(job);
  const typing = settled && !running && outcome?.kind !== "open";
  const finished = atTop;

  /** The first key after a miss rolls the train back down to the start. */
  const edit = (value: string) => {
    setEntry(value);
    if (outcome) {
      setOutcome(null);
      setMoment(null);
      setMs(1400);
      setX(startX);
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

  const driveTo = async (to: number, duration: number) => {
    setMs(duration);
    setX(to);
    await wait(duration + 100);
  };

  const run = async () => {
    const typed = toUnits(entry, dp);
    if (typed === null || running) return;
    setRunning(true);
    setOutcome(null);
    setMoment(null);
    setMood("neutral");
    setCaption("");
    setMs(0);
    setX(startX);
    let cur = job.unknown === "start" ? typed : job.start;
    setCargo(cur);
    await wait(500);
    for (const [i, s] of job.stops.entries()) {
      const moved = job.unknown === "change" && job.at === i ? typed : s.amount;
      await driveTo(noseAt(xs[i] ?? 0), 1300);
      if (!alive.current) return;
      if (!s.load && moved > cur) {
        setRunning(false);
        setOutcome({ kind: "stall", stop: i });
        setMood("encouraging");
        say(
          `The train only has ${fmt(cur, dp)} ${u}. It can't drop off that many.`,
        );
        return;
      }
      setMoment({
        x: xs[i] ?? 0,
        text: `${s.load ? "+" : "−"}${fmt(moved, dp)}`,
      });
      const next = s.load ? cur + moved : cur - moved;
      await tick(cur, next);
      cur = next;
      await wait(350);
      setMoment(null);
      setMood("happy");
    }
    await driveTo(atGateX, 1200);
    if (!alive.current) return;
    setChecking(true);
    await wait(700);
    setChecking(false);
    const need = job.unknown === "end" ? typed : job.end;
    if (cur !== need) {
      setRunning(false);
      setOutcome({ kind: "wrong" });
      setMood("encouraging");
      say(
        job.unknown === "end"
          ? `Your number is too ${need > cur ? "big" : "small"}.`
          : `The train arrived with ${fmt(cur, dp)} ${u}. The gate's sign says ${fmt(need, dp)}.`,
      );
      return;
    }
    setOutcome({ kind: "open" });
    setMood("cheering");
    say("It made it! The gate opens.");
    await wait(700);
    await driveTo(pastGateX, 1300);
    if (!alive.current) return;
    setRunning(false);
    setCleared(trip + 1);
    const gate = gates[trip] ?? valley;
    setTiny(gate);
    skipped.current = false;
    setInstant(false);
    if (trip + 1 < tripsPerClimb) {
      setCaption("");
      await climbTo(trip + 1, jobs);
      return;
    }
    // The last gate: pull back and climb to the summit.
    setSettled(false);
    setCaption("");
    setCamera(null);
    await beat(1000);
    setTiny(summit);
    await beat(1500);
    if (!alive.current) return;
    setAtTop(true);
    setEntry("");
    say("You made it to the top! Great work!");
  };

  const again = () => {
    const nextJobs = makeClimb(grade);
    setJobs(nextJobs);
    setTrip(0);
    setCleared(0);
    setAtTop(false);
    setTiny(valley);
    setEntry("");
    setCargo(null);
    setOutcome(null);
    setMood("neutral");
    void open(nextJobs);
  };

  const shown = (known: number, isMissing: boolean) =>
    isMissing ? entry || "?" : fmt(known, dp);

  const hideLoad = job.unknown === "end" && running;
  const load =
    cargo === null
      ? job.unknown === "start"
        ? entry || "?"
        : fmt(job.start, dp)
      : hideLoad || (job.unknown === "end" && outcome?.kind === "wrong")
        ? "?"
        : fmt(cargo, dp);

  const at = camera === null ? null : stretchAt(camera);
  const zoom = 1 / stretchScale;
  const panel = stretchAt(trip);

  const scene = (
    <svg
      viewBox={`0 0 ${viewW} ${viewH}`}
      style={{
        display: "block",
        height: "100%",
        maxWidth: "100%",
        aspectRatio: "2",
        margin: "0 auto",
        borderRadius: 16,
        userSelect: "none",
      }}
      role="img"
      aria-label="A train climbing a mountain"
    >
      <style>
        {`@keyframes climb-shudder {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }`}
      </style>
      <g
        style={{
          transform: at
            ? `translate(${-at.x * zoom}px, ${-at.y * zoom}px) scale(${zoom})`
            : "translate(0px, 0px) scale(1)",
          transition: instant ? "none" : "transform 1200ms ease-in-out",
        }}
      >
        <Mountain tiny={tiny} cleared={cleared} atTop={atTop} />
        {/* The stretch sits on the mountain, and fades in as the camera arrives. */}
        <svg
          role="img"
          aria-label="One stretch of the track"
          x={panel.x}
          y={panel.y}
          width={viewW * stretchScale}
          height={viewH * stretchScale}
          viewBox={`0 0 ${viewW} ${viewH}`}
          style={{
            opacity: camera === trip ? 1 : 0,
            transition: instant
              ? "none"
              : camera === trip
                ? "opacity 450ms ease 750ms"
                : "opacity 350ms ease",
          }}
        >
          <Scenery trip={trip} />
          <Sign
            x={startSignX}
            title="leaves with"
            value={shown(job.start, job.unknown === "start")}
            tone={palette.ink[7]}
            missing={job.unknown === "start"}
            bad={false}
          />
          {job.stops.map((s, i) => (
            <Sign
              key={s.name}
              x={xs[i] ?? 0}
              title={`${s.name} ${s.load ? "+" : "−"}`}
              value={shown(s.amount, job.unknown === "change" && job.at === i)}
              tone={s.load ? palette.leaf[7] : palette.sky[7]}
              missing={job.unknown === "change" && job.at === i}
              bad={outcome?.kind === "stall" && outcome.stop === i}
            />
          ))}
          <Sign
            x={gateX + 20}
            title="arrives with"
            value={shown(job.end, job.unknown === "end")}
            tone={palette.berry[7]}
            missing={job.unknown === "end"}
            bad={outcome?.kind === "wrong"}
            checking={checking}
          />
          <Gate open={outcome?.kind === "open"} instant={instant} />
          <Train
            x={x}
            ms={ms}
            load={load}
            shaking={outcome?.kind === "stall"}
          />
          {moment && (
            <text
              x={moment.x}
              y={trackY(moment.x) - 226}
              textAnchor="middle"
              fontSize={52}
              fontWeight={900}
              fill={palette.ink[9]}
              stroke="white"
              strokeWidth={7}
              paintOrder="stroke"
            >
              {moment.text}
            </text>
          )}
        </svg>
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
        {entry || " "}
      </div>
      <NumberPad
        value={entry}
        onChange={edit}
        dp={dp}
        maxDigits={String(job.kind.max).length}
        disabled={!typing}
      />
      {finished ? (
        <BigButton tone="next" onClick={again}>
          Climb again
        </BigButton>
      ) : !settled ? (
        <BigButton tone="next" onClick={skip}>
          Skip
        </BigButton>
      ) : (
        <BigButton onClick={run} disabled={!typing || entry === ""}>
          {running ? "Running…" : "Go ▶"}
        </BigButton>
      )}
    </>
  );

  return (
    <Stage
      avatar={<Avatar expression={mood} size={80} />}
      caption={caption}
      progress={`${cleared} / ${tripsPerClimb} gates`}
      scene={scene}
      side={side}
    />
  );
}
