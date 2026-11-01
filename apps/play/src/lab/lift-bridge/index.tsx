// Lift Bridge: plan, then watch. A bridge over a river balances on a pivot:
// a vehicle on one end, a counterweight bucket on the other. Set the
// bucket's weight, pull the pin, and the bridge settles level so the vehicle
// drives across, or tips and dumps it in the river. Every job compares two
// weights. Rough prototype; see ../README.md.
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
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  title: "Lift Bridge",
  isArchived: true,
  pitch:
    "A bridge balances on a pivot over a river, with a vehicle on one end and a counterweight bucket on the other. Work out the bucket's weight from what you're told (what's already in it, or how much heavier or lighter this vehicle is than another), then pull the pin and watch it balance or tip.",
  expectations: ["math-2020.g3.B2.5", "math-2020.g4.B2.4", "math-2020.g5.B2.4"],
  misconceptions: [
    {
      id: "adds-instead-of-finding-the-difference",
      fails:
        "The truck weighs 681 kg and the bucket already holds 470 kg. Adding 1151 more: the bucket slams down, the truck's end flies up, and the truck slides off into the river.",
    },
    {
      id: "heavier-means-add",
      fails:
        '"The bus weighs 1250 kg. The bus is 380 kg heavier than the van. The van is on the bridge." Adding because of "heavier" (1630 kg): the bucket is far too heavy, the van\'s end flips up and the van rolls off into the river. Likewise subtracting for "lighter" when the heavier vehicle is on the bridge.',
    },
    {
      id: "lines-up-digits-not-units",
      fails:
        "At Grade 5, a 2.18 tonne truck with 0.4 tonnes already in the bucket, adding 2.14 (2.18 − 0.4 with the digits lined up from the right): the bucket's end drops and the truck rolls off into the river.",
    },
  ],
  sampleTask:
    "math-2020.g3.B2.5's compare situations (the difference between 681 and 470) and math-2020.g4.B2.4's compare situations with the larger or smaller amount unknown (8.8 cm longer than the perimeter of Rectangle B). math-2020.g5.B2.4's 2.4 compared with 0.6.",
  fun: "Poly Bridge's loop: set it up, then test it and watch the physics decide. The near miss is visible (a slight tilt) and the big miss is a spectacular splash, so every run is worth watching.",
};

const jobsPerRound = 6;
type Compare = "difference" | "smaller" | "larger";
type Mood = "thinking" | "happy" | "encouraging" | "cheering";

interface Job {
  kind: Kind;
  compare: Compare;
  /** The weight of the vehicle on the bridge. */
  weight: number;
  /** What the bucket already holds (difference jobs only). */
  inBucket: number;
  /** The other vehicle, parked on the far bank (smaller and larger jobs). */
  other: number;
  /** How much heavier or lighter the bridge's vehicle is than the other. */
  by: number;
}

function makeJob(grade: number, round: number): Job {
  const kind = kindFor(grade, round);
  const compare =
    (["difference", "smaller", "larger"] as const)[round % 3] ?? "difference";
  const M = kind.max;
  for (;;) {
    if (compare === "difference") {
      const weight = amount(kind, M * 0.35, M * 0.9);
      const inBucket = weight && amount(kind, M * 0.1, weight - M * 0.08);
      if (!weight || !inBucket) continue;
      return { kind, compare, weight, inBucket, other: 0, by: 0 };
    }
    if (compare === "smaller") {
      const other = amount(kind, M * 0.45, M * 0.9);
      const by = other && amount(kind, M * 0.08, other - M * 0.15);
      if (!other || !by) continue;
      return { kind, compare, weight: other - by, inBucket: 0, other, by };
    }
    const other = amount(kind, M * 0.15, M * 0.5);
    const by = other && amount(kind, M * 0.08, M * 0.9 - other);
    if (!other || !by) continue;
    return { kind, compare, weight: other + by, inBucket: 0, other, by };
  }
}

const unit = (kind: Kind) => (kind.dp ? "tonnes" : "kilograms");
const unitShort = (kind: Kind) => (kind.dp ? "t" : "kg");

function story(job: Job): string {
  const v = (n: number) => `${fmt(n, job.kind.dp)} ${unit(job.kind)}`;
  if (job.compare === "difference")
    return `The truck weighs ${v(job.weight)}. The bucket already holds ${v(job.inBucket)}. How much more should go in the bucket to balance the bridge?`;
  if (job.compare === "smaller")
    return `The bus weighs ${v(job.other)}. The bus is ${v(job.by)} heavier than the van. The van is on the bridge. How heavy should the bucket be?`;
  return `The van weighs ${v(job.other)}. The van is ${v(job.by)} lighter than the bus. The bus is on the bridge. How heavy should the bucket be?`;
}

// The scene, in viewBox units.
const pivot = { x: 470, y: 250 };
const half = 340;
const riverY = 360;

type Phase = "plan" | "tilting" | "crossing" | "falling";

export default function LiftBridge({ grade, Avatar, speak }: PrototypeProps) {
  const [round, setRound] = useState(0);
  const [job, setJob] = useState(() => makeJob(grade, 0));
  const [entry, setEntry] = useState("");
  const [angle, setAngle] = useState(0);
  const [phase, setPhase] = useState<Phase>("plan");
  /** Where the vehicle is along the bridge, from the pivot. */
  const [along, setAlong] = useState(-200);
  const [ok, setOk] = useState<boolean | null>(null);
  const [mood, setMood] = useState<Mood>("thinking");
  const alive = useRef(true);
  const dp = job.kind.dp;
  const done = ok && round >= jobsPerRound - 1;
  const running = phase !== "plan" && ok === null;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const reset = () => {
    setAngle(0);
    setAlong(-200);
    setPhase("plan");
    setOk(null);
  };

  useEffect(() => {
    setEntry("");
    setAngle(0);
    setAlong(-200);
    setPhase("plan");
    setOk(null);
    speak(
      round === 0
        ? `${story(job)} Type the bucket's weight, then pull the pin.`
        : story(job),
    );
  }, [job, round, speak]);

  const edit = (value: string) => {
    setEntry(value);
    if (ok === false) {
      reset();
      setMood("thinking");
    }
  };

  const run = async () => {
    const typed = toUnits(entry, dp);
    if (typed === null || running) return;
    const bucket = job.compare === "difference" ? job.inBucket + typed : typed;
    const diff = bucket - job.weight;
    // Bucket heavier: its end (the right) goes down, a clockwise turn.
    const tilt =
      diff === 0
        ? 0
        : Math.sign(diff) *
          Math.min(24, 4 + (20 * Math.abs(diff)) / job.weight);
    setPhase("tilting");
    setOk(null);
    await wait(250);
    setAngle(tilt);
    await wait(1100);
    if (!alive.current) return;
    const u = unit(job.kind);
    const name =
      job.compare === "difference"
        ? "truck"
        : job.compare === "smaller"
          ? "van"
          : "bus";
    if (diff === 0) {
      setPhase("crossing");
      setAlong(half + 160);
      await wait(1600);
      if (!alive.current) return;
      setOk(true);
      setMood("cheering");
      speak(
        round >= jobsPerRound - 1
          ? `It balances! The ${name} made it across. Every crossing is done!`
          : `It balances! The ${name} made it across.`,
      );
      return;
    }
    // Downhill is toward the low end: the bucket's side if it's heavier.
    setPhase("falling");
    setAlong(diff > 0 ? half - 40 : -half + 40);
    await wait(1400);
    if (!alive.current) return;
    setOk(false);
    setMood("encouraging");
    speak(
      `Splash! The bucket weighed ${fmt(bucket, dp)} ${u}, and the ${name} weighs ${fmt(job.weight, dp)} ${u}.`,
    );
  };

  const next = () => {
    const r = done ? 0 : round + 1;
    setRound(r);
    setMood("thinking");
    setJob(makeJob(grade, r));
  };

  const us = unitShort(job.kind);
  const typedShown = entry || "?";
  const name =
    job.compare === "difference"
      ? "truck"
      : job.compare === "smaller"
        ? "van"
        : "bus";
  const otherName = job.compare === "smaller" ? "bus" : "van";
  const vehicleLabel =
    job.compare === "difference" ? `${fmt(job.weight, dp)} ${us}` : `? ${us}`;
  const fell = phase === "falling" && ok === false;
  const rad = (angle * Math.PI) / 180;
  // Where the vehicle went into the river, in scene units.
  const splashX = pivot.x + Math.cos(rad) * along;

  const vehicle = (label: string, w: number, color: string) => (
    <g>
      <rect
        x={-w / 2}
        y={-62}
        width={w}
        height={52}
        rx={8}
        fill={color}
        stroke={palette.ink[8]}
        strokeWidth={3}
      />
      <rect
        x={w / 2 - 34}
        y={-54}
        width={24}
        height={20}
        rx={3}
        fill={palette.sky[1]}
      />
      <circle cx={-w / 2 + 22} cy={-8} r={10} fill={palette.ink[8]} />
      <circle cx={w / 2 - 22} cy={-8} r={10} fill={palette.ink[8]} />
      <text
        x={-10}
        y={-28}
        textAnchor="middle"
        fontSize={20}
        fontWeight={900}
        fill="white"
      >
        {label}
      </text>
    </g>
  );

  const scene = (
    <svg
      viewBox="0 0 960 420"
      style={{ width: "100%", height: "100%", userSelect: "none" }}
      role="img"
      aria-label="A bridge balanced on a pivot over a river"
    >
      <rect x={0} y={riverY} width={960} height={60} fill={palette.sky[3]} />
      <rect
        x={0}
        y={pivot.y}
        width={pivot.x - half - 10}
        height={420 - pivot.y}
        fill={palette.leaf[4]}
      />
      <rect
        x={pivot.x + half + 10}
        y={pivot.y}
        width={960}
        height={420 - pivot.y}
        fill={palette.leaf[4]}
      />
      {/* The other vehicle, parked on the far bank, with its weight */}
      {job.compare !== "difference" && (
        <g transform={`translate(${pivot.x + half + 70} ${pivot.y})`}>
          {vehicle(fmt(job.other, dp), 100, palette.slate[5])}
          <text
            x={0}
            y={-74}
            textAnchor="middle"
            fontSize={20}
            fontWeight={800}
            fill={palette.ink[8]}
          >
            {otherName}
          </text>
        </g>
      )}
      {/* Tower */}
      <polygon
        points={`${pivot.x - 40},${riverY} ${pivot.x + 40},${riverY} ${pivot.x},${pivot.y}`}
        fill={palette.ink[5]}
      />
      {/* The bridge, turning about the pivot */}
      <g
        style={{
          transformOrigin: `${pivot.x}px ${pivot.y}px`,
          transform: `rotate(${angle}deg)`,
          transition: "transform 1000ms cubic-bezier(.5,1.6,.5,1)",
        }}
      >
        <rect
          x={pivot.x - half}
          y={pivot.y - 6}
          width={half * 2}
          height={16}
          rx={4}
          fill={palette.sand[5]}
          stroke={palette.ink[7]}
          strokeWidth={3}
        />
        {/* Bucket under the right end */}
        <line
          x1={pivot.x + half - 60}
          x2={pivot.x + half - 60}
          y1={pivot.y + 10}
          y2={pivot.y + 28}
          stroke={palette.ink[7]}
          strokeWidth={4}
        />
        <path
          d={`M ${pivot.x + half - 125} ${pivot.y + 28} h 130 l -16 72 h -98 z`}
          fill={entry ? palette.sky[1] : "white"}
          stroke={palette.sky[7]}
          strokeWidth={4}
          strokeDasharray={entry ? undefined : "9 6"}
        />
        <text
          x={pivot.x + half - 60}
          y={pivot.y + 60}
          textAnchor="middle"
          fontSize={20}
          fontWeight={800}
          fill={palette.ink[8]}
        >
          {job.compare === "difference"
            ? `${fmt(job.inBucket, dp)} +`
            : "bucket"}
        </text>
        <text
          x={pivot.x + half - 60}
          y={pivot.y + 90}
          textAnchor="middle"
          fontSize={typedShown.length > 6 ? 22 : 28}
          fontWeight={900}
          fill={palette.sky[8]}
        >
          {typedShown}
        </text>
        {/* Pin */}
        {phase === "plan" && (
          <rect
            x={pivot.x - 8}
            y={pivot.y - 36}
            width={16}
            height={60}
            rx={4}
            fill={palette.ember[6]}
          />
        )}
        {/* The vehicle on the bridge */}
        {!fell && (
          <g
            style={{
              transform: `translate(${pivot.x + along}px, ${pivot.y - 6}px)`,
              transition:
                phase === "plan" ? "none" : "transform 1300ms ease-in",
            }}
          >
            {vehicle(
              vehicleLabel,
              job.compare === "difference" ? 150 : 170,
              palette.berry[6],
            )}
            <text
              x={0}
              y={-74}
              textAnchor="middle"
              fontSize={20}
              fontWeight={800}
              fill={palette.ink[8]}
            >
              {name}
            </text>
          </g>
        )}
      </g>
      {fell && (
        <g>
          <circle
            cx={splashX}
            cy={riverY + 8}
            r={44}
            fill="white"
            opacity={0.85}
          />
          <circle
            cx={splashX - 40}
            cy={riverY - 20}
            r={14}
            fill="white"
            opacity={0.8}
          />
          <circle
            cx={splashX + 44}
            cy={riverY - 26}
            r={10}
            fill="white"
            opacity={0.8}
          />
        </g>
      )}
    </svg>
  );

  const side = (
    <>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          textAlign: "center",
          color: palette.ink[7],
        }}
      >
        {job.compare === "difference"
          ? "Add to the bucket"
          : "The bucket weighs"}
      </div>
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
        {entry ? `${entry} ${us}` : " "}
      </div>
      <NumberPad
        value={entry}
        onChange={edit}
        dp={dp}
        maxDigits={String(job.kind.max).length}
        disabled={running || !!ok}
      />
      {ok ? (
        <BigButton tone="next" onClick={next}>
          {done ? "Play again" : "Next →"}
        </BigButton>
      ) : (
        <BigButton onClick={run} disabled={running || entry === ""}>
          {running ? "Watch…" : "Pull the pin"}
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
