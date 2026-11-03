// Fraction Hop's real board and rules, with one journey to a treasure over a
// play: six courses, then the chest. The three hop-* journey prototypes differ
// only in how the student sees how far they've come. The board is laid over from
// the outside, so the game's code doesn't change for a prototype. Rough; see
// README.md.
import { palette } from "@repo/tokens";
import {
  type ComponentProps,
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Board } from "../../../../games/fraction-hop/src/game/Board.tsx";
import {
  type Hopper,
  home,
  hopMs,
  sinkMs,
} from "../../../../games/fraction-hop/src/game/Course.tsx";
import {
  type Run,
  type RunEnd,
  shortestRoute,
} from "../../../../games/fraction-hop/src/rules/course.ts";
import {
  generatePlay,
  type TierId,
  tasksPerPlay,
} from "../../../../games/fraction-hop/src/rules/generate.ts";
import {
  addBlock,
  finishRun,
  introLines,
  moveBlock,
  pressPlay,
  removeAt,
  startTask,
  type TaskState,
  tapHint,
} from "../../../../games/fraction-hop/src/rules/task.ts";
import {
  type StringId,
  strings,
} from "../../../../games/fraction-hop/src/strings.ts";
import { seeded } from "../../../../packages/game-kit/src/random.ts";
import { wait } from "./add-sub-kit.tsx";
import type { PrototypeMeta, PrototypeProps } from "./prototype.ts";

export const hopGrounding = {
  expectations: ["math-2020.g3.B2.8", "math-2020.g4.B1.6", "math-2020.g5.B1.3"],
  misconceptions: [
    {
      id: "bigger-denominator-bigger",
      fails:
        "Picking ⅛ to clear a gap because 8 is bigger than 4: the hop is tiny and the avatar splashes, as in the built game.",
    },
    {
      id: "numerator-not-a-count",
      fails:
        "For a goal at ³⁄₈, three ¼ hops: the avatar lands at ⁶⁄₈, past the goal, as in the built game.",
    },
  ],
  sampleTask:
    "math-2020.g3.B2.8's sample task: 4/5 as one fifth added four times. Each hop here is one of those fifths, as in the built game.",
} satisfies Partial<PrototypeMeta>;

export type HopJourneyKind = "pull-back" | "strip" | "horizon";

const goalLine = "Let's hop across the islands to the treasure!";
const endLine = "You found the treasure! Great hopping!";

const solvedMs = 500;
const takeoffMs = 40;
const zoomMs = 800;
/** How long the map fades over the course, ending as the zoom ends. */
const mapFadeMs = 350;
/** The map's avatar on the whole map, in px. */
const walkerPx = 48;
/** Its size at the map's scale once zoomed in, so it lands as the course's hopper. */
const landingPx = 30;
/** Its middle, above the spot its feet stand on. */
const walkerRise = 20;
const settleMs = 150;
const walkMs = 1000;
const walkToChestMs = 1200;
const stripWalkMs = 900;
const fadeMs = 250;
const scrollMs = 1700;
const endingMs = 3800;

// ---- The map, in viewBox units ----

const mapW = 1300;
const mapH = 570;
const spots = [
  { x: 130, y: 395 },
  { x: 365, y: 430 },
  { x: 575, y: 285 },
  { x: 320, y: 150 },
  { x: 690, y: 105 },
  { x: 935, y: 270 },
] as const;
const chestSpot = { x: 1150, y: 130 };

/** The path from each spot to the next, with the last leading to the chest. */
const legs = [
  "M130 395 C 190 465, 290 480, 365 430",
  "M365 430 C 470 400, 590 390, 575 285",
  "M575 285 C 550 200, 410 240, 320 150",
  "M320 150 C 390 50, 560 40, 690 105",
  "M690 105 C 800 120, 890 180, 935 270",
  "M935 270 C 990 350, 1130 270, 1150 130",
] as const;

const palmAt = (x: number, y: number) => (
  <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
    <path
      d="M0 0 q4 -22 -2 -40"
      stroke={palette.sand[7]}
      strokeWidth={5}
      fill="none"
      strokeLinecap="round"
    />
    <path
      d="M-2 -40 q-18 -6 -24 8 M-2 -40 q18 -8 24 6 M-2 -40 q-8 -16 -20 -14 M-2 -40 q8 -16 20 -14"
      stroke={palette.leaf[6]}
      strokeWidth={5}
      fill="none"
      strokeLinecap="round"
    />
  </g>
);

function Chest({ open, size }: { open: boolean; size: number }) {
  return (
    <svg
      viewBox="0 0 100 90"
      width={size}
      height={size * 0.9}
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      {open && (
        <>
          <path
            d="M8 44 C 8 -14, 92 -14, 92 44 Z"
            fill={palette.ember[8]}
            stroke={palette.ink[9]}
            strokeWidth={3}
          />
          <path
            d="M14 46 C 22 22, 78 22, 86 46 Z"
            fill={palette.sunshine[4]}
            stroke={palette.sunshine[7]}
            strokeWidth={2}
          />
        </>
      )}
      <rect
        x={8}
        y={44}
        width={84}
        height={42}
        rx={5}
        fill={palette.ember[7]}
        stroke={palette.ink[9]}
        strokeWidth={3}
      />
      <rect x={8} y={56} width={84} height={7} fill={palette.sunshine[5]} />
      {!open && (
        <>
          <path
            d="M8 44 C 8 14, 92 14, 92 44 Z"
            fill={palette.ember[6]}
            stroke={palette.ink[9]}
            strokeWidth={3}
          />
          <rect
            x={43}
            y={38}
            width={14}
            height={20}
            rx={3}
            fill={palette.sunshine[4]}
            stroke={palette.ink[9]}
            strokeWidth={2}
          />
        </>
      )}
    </svg>
  );
}

/** The whole map: islands, the dashed path, a marker per course and the chest. */
function MapArt({
  done,
  legRefs,
}: {
  done: number;
  legRefs: React.RefObject<(SVGPathElement | null)[]>;
}) {
  return (
    <svg
      viewBox={`0 0 ${mapW} ${mapH}`}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      aria-hidden="true"
    >
      <rect width={mapW} height={mapH} fill={palette.sky[3]} />
      {[40, 150, 260, 370, 480, 550].map((y, row) =>
        [0, 1, 2, 3, 4].map((col) => (
          <path
            key={`${y}-${col}`}
            d={`M${col * 260 + (row % 2) * 130 + 40} ${y} q16 -9 32 0 t32 0`}
            stroke={palette.sky[1]}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
          />
        )),
      )}
      {/* Land under each stretch of the path */}
      {[
        { cx: 250, cy: 420, rx: 215, ry: 72 },
        { cx: 575, cy: 305, rx: 120, ry: 62 },
        { cx: 320, cy: 160, rx: 130, ry: 66 },
        { cx: 690, cy: 115, rx: 120, ry: 58 },
        { cx: 935, cy: 290, rx: 110, ry: 58 },
        { cx: 1150, cy: 155, rx: 122, ry: 74 },
      ].map((land) => (
        <g key={land.cx}>
          <ellipse {...land} cy={land.cy + 8} fill={palette.sand[3]} />
          <ellipse
            {...land}
            rx={land.rx - 14}
            ry={land.ry - 12}
            fill={palette.leaf[4]}
          />
        </g>
      ))}
      {[
        palmAt(60, 400),
        palmAt(215, 175),
        palmAt(650, 280),
        palmAt(790, 95),
        palmAt(1020, 285),
      ]}
      {legs.map((d, i) => (
        <path
          key={d}
          ref={(el) => {
            legRefs.current[i] = el;
          }}
          d={d}
          fill="none"
          stroke={i < done ? palette.sunshine[5] : palette.sand[0]}
          strokeWidth={8}
          strokeDasharray="4 18"
          strokeLinecap="round"
        />
      ))}
      {spots.map((spot, i) => (
        <circle
          key={spot.x}
          cx={spot.x}
          cy={spot.y}
          r={22}
          fill={i < done ? palette.sunshine[4] : palette.sand[0]}
          stroke={palette.ink[9]}
          strokeWidth={4}
          data-spot={i}
          data-done={i < done || undefined}
        />
      ))}
      {/* The X, and the chest on it */}
      <g transform={`translate(${chestSpot.x} ${chestSpot.y + 30})`}>
        <path
          d="M-34 -14 L34 14 M-34 14 L34 -14"
          stroke={palette.ember[7]}
          strokeWidth={9}
          strokeLinecap="round"
        />
      </g>
      <g transform={`translate(${chestSpot.x - 50} ${chestSpot.y - 74})`}>
        <path
          d="M8 44 C 8 14, 92 14, 92 44 Z"
          fill={palette.ember[6]}
          stroke={palette.ink[9]}
          strokeWidth={3}
        />
        <rect
          x={8}
          y={44}
          width={84}
          height={42}
          rx={5}
          fill={palette.ember[7]}
          stroke={palette.ink[9]}
          strokeWidth={3}
        />
        <rect x={8} y={56} width={84} height={7} fill={palette.sunshine[5]} />
        <rect
          x={43}
          y={38}
          width={14}
          height={20}
          rx={3}
          fill={palette.sunshine[4]}
          stroke={palette.ink[9]}
          strokeWidth={2}
        />
      </g>
    </svg>
  );
}

/** The treasure island far off, drawn in its own box and scaled by the caller. */
function TreasureIsland() {
  return (
    <svg
      viewBox="0 0 320 170"
      style={{ display: "block", width: "100%", overflow: "visible" }}
      aria-hidden="true"
    >
      <ellipse cx={160} cy={160} rx={158} ry={40} fill={palette.sand[3]} />
      <ellipse cx={160} cy={150} rx={120} ry={46} fill={palette.leaf[4]} />
      <path
        d="M70 128 q6 -44 -6 -86"
        stroke={palette.sand[7]}
        strokeWidth={9}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M64 42 q-32 -10 -44 16 M64 42 q32 -14 44 12 M64 42 q-14 -28 -36 -24 M64 42 q14 -28 36 -24"
        stroke={palette.leaf[6]}
        strokeWidth={9}
        fill="none"
        strokeLinecap="round"
      />
      <g transform="translate(120 62) scale(1.05)">
        <path
          d="M8 44 C 8 14, 92 14, 92 44 Z"
          fill={palette.ember[6]}
          stroke={palette.ink[9]}
          strokeWidth={3}
        />
        <rect
          x={8}
          y={44}
          width={84}
          height={42}
          rx={5}
          fill={palette.ember[7]}
          stroke={palette.ink[9]}
          strokeWidth={3}
        />
        <rect x={8} y={56} width={84} height={7} fill={palette.sunshine[5]} />
        <rect
          x={43}
          y={38}
          width={14}
          height={20}
          rx={3}
          fill={palette.sunshine[4]}
          stroke={palette.ink[9]}
          strokeWidth={2}
        />
      </g>
    </svg>
  );
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Layout {
  root: { w: number; h: number };
  stage: Box;
  /** The room in the top row, between the goal and the hint button. */
  strip: Box;
}

function measure(root: HTMLElement): Layout | null {
  const svg = root.querySelector("svg[data-unit]");
  const goal = root.querySelector('[data-hand="goal"]');
  const hint = root.querySelector('[data-hand="hint"]');
  if (!svg || !goal) return null;
  const box = root.getBoundingClientRect();
  const s = svg.getBoundingClientRect();
  const g = goal.getBoundingClientRect();
  const right = hint ? hint.getBoundingClientRect().left : s.right - 200;
  return {
    root: { w: box.width, h: box.height },
    stage: {
      x: s.left - box.left,
      y: s.top - box.top,
      w: s.width,
      h: s.height,
    },
    strip: {
      x: g.right - box.left + 24,
      y: g.top - box.top - 6,
      w: Math.max(200, right - g.right - 48),
      h: Math.max(60, g.height + 12),
    },
  };
}

/** The map's size on screen, and where it sits, kept to its shape. */
function fitMap(root: { w: number; h: number }) {
  const k = Math.max(root.w / mapW, root.h / mapH);
  return {
    k,
    w: mapW * k,
    h: mapH * k,
    x: (root.w - mapW * k) / 2,
    y: (root.h - mapH * k) / 2,
  };
}

/** The camera that shows the whole map. */
const wide = { s: 1, x: 0, y: 0 };

type Phase = "opening" | "play" | "moment" | "ending" | "finished";

export function HopJourney({
  kind,
  grade,
  Avatar,
  speak: speakText,
}: PrototypeProps & { kind: HopJourneyKind }) {
  const [playNumber, setPlayNumber] = useState(1);
  return (
    <OnePlay
      key={playNumber}
      kind={kind}
      grade={grade}
      Avatar={Avatar}
      speak={speakText}
      onAgain={() => setPlayNumber((n) => n + 1)}
    />
  );
}

function OnePlay({
  kind,
  grade,
  Avatar,
  speak: speakText,
  onAgain,
}: PrototypeProps & { kind: HopJourneyKind; onAgain(): void }) {
  const tier = `g${Math.max(3, Math.min(5, grade))}` as TierId;
  const courses = useMemo(
    () => generatePlay(tier, seeded(Math.floor(Math.random() * 2 ** 31))),
    [tier],
  );
  const first = courses[0];
  if (!first) throw new Error("A play has courses");
  const [task, setTask] = useState<TaskState>(() => startTask(tier, 1, first));
  const current = useRef(task);
  const [hopper, setHopper] = useState<Hopper>(home);
  const [result, setResult] = useState<RunEnd | null>(null);
  const [running, setRunning] = useState(false);
  const [mood, setMood] =
    useState<ComponentProps<typeof Board>["expression"]>("neutral");
  const [caption, setCaption] = useState<readonly StringId[]>([]);
  const [missed, setMissed] = useState<number | null>(null);
  const [trail, setTrail] = useState(0);
  const [phase, setPhase] = useState<Phase>("opening");
  const [done, setDone] = useState(0);
  const [layout, setLayout] = useState<Layout | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const alive = useRef(true);

  // The map's own state
  const [mapShown, setMapShown] = useState(true);
  const [camera, setCamera] = useState<{ s: number; x: number; y: number }>({
    s: 1,
    x: 0,
    y: 0,
  });
  const [cameraMs, setCameraMs] = useState(0);
  const legRefs = useRef<(SVGPathElement | null)[]>([]);
  const walker = useRef<HTMLDivElement>(null);
  const [standingAt, setStandingAt] = useState(0);

  // The strip's and the horizon's
  const [hideCourse, setHideCourse] = useState(kind === "horizon");
  const [scrolling, setScrolling] = useState(false);
  const [scrollKey, setScrollKey] = useState(0);
  const [panorama, setPanorama] = useState(kind === "horizon");
  const [chest, setChest] = useState<"hidden" | "closed" | "open">("hidden");

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new plan clears them
  useEffect(() => {
    setMissed(null);
    setTrail(0);
  }, [task.plan]);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const update = () => setLayout(measure(el));
    update();
    const watch = new ResizeObserver(update);
    watch.observe(el);
    const svg = el.querySelector("svg[data-unit]");
    if (svg) watch.observe(svg);
    return () => watch.disconnect();
  }, []);

  const map = layout && fitMap(layout.root);

  /** Where the hopper stands on the course, on screen. */
  const hopperPoint = useCallback(() => {
    const el = root.current;
    const h = el?.querySelector('[data-testid="hopper"]');
    if (!el || !h) return null;
    const box = el.getBoundingClientRect();
    const r = h.getBoundingClientRect();
    return {
      x: r.left - box.left + r.width / 2,
      y: r.top - box.top + r.height / 2,
      size: r.height,
    };
  }, []);

  /** The camera that puts a place on the map on a point on screen. */
  const aim = useCallback(
    (
      at: { x: number; y: number },
      on: { x: number; y: number; size: number },
    ) => {
      if (!map) return wide;
      const s = on.size / landingPx;
      return {
        s,
        x: on.x - (map.x + at.x * map.k) * s,
        y: on.y - (map.y + at.y * map.k - walkerRise) * s,
      };
    },
    [map],
  );

  const t = useCallback((id: StringId) => strings[id] ?? id, []);

  /** Shows the caption, says it, and waits about as long as it takes to say. */
  const speak = useCallback(
    async (ids: readonly StringId[]) => {
      if (ids.length === 0) return;
      setCaption(ids);
      const text = ids.map((id) => t(id)).join(" ");
      speakText(text);
      await wait(Math.max(700, text.length * 62));
    },
    [speakText, t],
  );

  const commit = useCallback((next: TaskState) => {
    current.current = next;
    setTask(next);
  }, []);

  /** Puts the next course on the board, unannounced. */
  const setCourse = useCallback(
    (index: number) => {
      const course = courses[index - 1];
      if (!course) return;
      commit(startTask(tier, index, course));
      setHopper(home);
      setResult(null);
      setRunning(false);
      setMood("thinking");
      setCaption([]);
    },
    [commit, courses, tier],
  );

  const announce = useCallback(
    (index: number) => {
      const course = courses[index - 1];
      if (!course) return;
      setPhase("play");
      void speak(introLines(course));
    },
    [courses, speak],
  );

  /** Walks the map's avatar along one leg, in small hops. */
  const walk = useCallback(
    (leg: number, ms: number) =>
      new Promise<void>((resolve) => {
        const path = legRefs.current[leg];
        const el = walker.current;
        if (!path || !el || !map) {
          resolve();
          return;
        }
        const length = path.getTotalLength();
        const hops = 4;
        const begun = performance.now();
        const step = (now: number) => {
          const p = Math.min(1, (now - begun) / ms);
          const point = path.getPointAtLength(length * p);
          const lift = Math.abs(Math.sin(Math.PI * hops * p)) * 16;
          el.style.left = `${map.x + point.x * map.k}px`;
          el.style.top = `${map.y + point.y * map.k - lift}px`;
          if (p < 1 && alive.current) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      }),
    [map],
  );

  const placeWalker = useCallback(
    (at: { x: number; y: number }) => {
      const el = walker.current;
      if (!el || !map) return;
      el.style.left = `${map.x + at.x * map.k}px`;
      el.style.top = `${map.y + at.y * map.k}px`;
    },
    [map],
  );

  const mapReady = map !== null;
  // biome-ignore lint/correctness/useExhaustiveDependencies: places it as the map first measures
  useLayoutEffect(() => {
    if (!mapReady) return;
    const at =
      standingAt >= spots.length ? chestSpot : (spots[standingAt] ?? chestSpot);
    placeWalker(at);
  }, [mapReady, layout]);

  // The opening.
  const opened = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, as the play opens
  useEffect(() => {
    if (!layout || opened.current) return;
    opened.current = true;
    void (async () => {
      await wait(400);
      await speak([goalLine as StringId]);
      if (!alive.current) return;
      setCaption([]);
      if (kind === "pull-back") {
        const on = hopperPoint();
        const spot = spots[0];
        if (on && spot) {
          setCameraMs(zoomMs);
          setCamera(aim(spot, on));
        }
        await wait(zoomMs - mapFadeMs);
        setMapShown(false);
        await wait(mapFadeMs);
      } else if (kind === "strip") {
        setMapShown(false);
        await wait(fadeMs);
      } else {
        setPanorama(false);
        setHideCourse(false);
        await wait(fadeMs);
      }
      if (alive.current) announce(1);
    })();
  }, [layout]);

  /** The moment between two courses. */
  const moment = useCallback(
    async (index: number) => {
      const began = performance.now();
      setPhase("moment");
      setCaption([]);
      if (kind === "pull-back") {
        const from = spots[index - 1];
        const to = spots[index];
        const on = hopperPoint();
        if (from && on) {
          setCameraMs(0);
          setCamera(aim(from, on));
          placeWalker(from);
          await wait(30);
          setMapShown(true);
          setCameraMs(zoomMs);
          setCamera(wide);
          await wait(zoomMs);
        }
        setDone(index);
        await wait(settleMs);
        await walk(index - 1, walkMs);
        setStandingAt(index);
        // Behind the map: the next course, so the camera can aim at its start.
        setCourse(index + 1);
        await wait(30);
        const next = hopperPoint();
        if (to && next) {
          setCameraMs(zoomMs);
          setCamera(aim(to, next));
        }
        await wait(zoomMs - mapFadeMs);
        setMapShown(false);
        await wait(mapFadeMs);
      } else if (kind === "strip") {
        setDone(index);
        setStandingAt(index);
        await wait(stripWalkMs);
        setHideCourse(true);
        await wait(fadeMs);
        setCourse(index + 1);
        await wait(30);
        setHideCourse(false);
        await wait(fadeMs);
      } else {
        setHideCourse(true);
        setPanorama(true);
        await wait(fadeMs);
        setDone(index);
        setScrollKey((n) => n + 1);
        setScrolling(true);
        await wait(scrollMs);
        setScrolling(false);
        setCourse(index + 1);
        await wait(30);
        setPanorama(false);
        setHideCourse(false);
        await wait(fadeMs);
      }
      console.info(
        `[hop journey] moment ${index}: ${Math.round(performance.now() - began)} ms`,
      );
      if (alive.current) announce(index + 1);
    },
    [aim, announce, hopperPoint, kind, placeWalker, setCourse, walk],
  );

  const ending = useCallback(async () => {
    setPhase("ending");
    setCaption([]);
    setMood("cheering");
    setDone(tasksPerPlay);
    if (kind !== "horizon") {
      const from = spots[tasksPerPlay - 1];
      if (from) placeWalker(from);
      setCameraMs(0);
      setCamera(wide);
      await wait(30);
      setMapShown(true);
      await wait(fadeMs);
      await walk(tasksPerPlay - 1, walkToChestMs);
      setStandingAt(tasksPerPlay);
    } else {
      setHideCourse(true);
      setPanorama(true);
      setScrollKey((n) => n + 1);
      setScrolling(true);
      await wait(1200);
      setScrolling(false);
    }
    setChest("closed");
    await wait(450);
    setChest("open");
    const said = speak([endLine as StringId]);
    await Promise.all([said, wait(endingMs)]);
    if (alive.current) setPhase("finished");
  }, [kind, placeWalker, speak, walk]);

  const solved = async (finished: TaskState, fixed: boolean) => {
    const cheer: StringId[] = fixed ? ["run.nice-fix"] : [];
    await speak([...cheer, "run.solved"]);
    await wait(solvedMs);
    if (!alive.current) return;
    if (finished.index < tasksPerPlay) return moment(finished.index);
    return ending();
  };

  /** Plays a run's hops; settles when the run has ended. */
  const hop = (run: Run) =>
    new Promise<void>((resolve) => {
      setRunning(true);
      setResult(null);
      setTrail(0);
      setHopper(home);
      setMood("happy");
      let from = 0;
      for (const [key, to] of run.landings.entries()) {
        const start = from;
        window.setTimeout(
          () => {
            setHopper({ at: to, flight: { from: start, key }, sunk: false });
            setTrail(key + 1);
          },
          takeoffMs + key * hopMs,
        );
        from = to;
      }
      const landed = takeoffMs + run.landings.length * hopMs;
      window.setTimeout(() => {
        setHopper({ at: from, flight: null, sunk: run.end.kind === "splash" });
      }, landed);
      window.setTimeout(
        () => {
          setRunning(false);
          setResult(run.end);
          setMissed(run.end.kind === "splash" ? run.end.hop : null);
          setMood(
            run.end.kind === "goal"
              ? "cheering"
              : run.end.kind === "short"
                ? "happy"
                : "encouraging",
          );
          resolve();
        },
        landed + (run.end.kind === "splash" ? sinkMs : 150),
      );
    });

  const edit = () => {
    setHopper(home);
    setMood("thinking");
  };

  const covering = chest !== "hidden";
  const islandScale = 0.34 + (0.66 * done) / tasksPerPlay;
  const stoneRow = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);
  const stage = layout?.stage;
  const groundAt = stage ? (stage.h * 196) / 340 : 0;
  const waterAt = stage ? (stage.h * 206) / 340 : 0;
  const waterH = stage ? (stage.h * 44) / 340 : 0;
  const hopperPx = stage ? (stage.h * 88) / 340 : 60;

  return (
    <div
      ref={root}
      data-testid="hop-journey"
      data-phase={phase}
      data-done={done}
      data-hide-course={hideCourse || undefined}
      style={{ position: "relative", height: "100%", overflow: "hidden" }}
    >
      <style>{`
        [data-testid="hop-journey"] svg[data-unit] { transition: opacity ${fadeMs}ms; }
        [data-testid="hop-journey"][data-hide-course] svg[data-unit] { opacity: 0; }
        ${kind === "horizon" ? '[data-testid="hop-journey"] svg[data-unit] > rect:first-of-type { fill: transparent; }' : ""}
        @keyframes hop-bob { 50% { transform: translateY(-34%); } }
        @keyframes hop-rays { to { transform: rotate(360deg); } }
        @keyframes hop-rise { from { transform: scale(0.3); opacity: 0; } }
        @keyframes hop-coin { 0% { transform: translate(0, 0) scale(0.4); opacity: 0; } 20% { opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 0; } }
        @keyframes hop-pop { 40% { transform: scale(1.3); } }
      `}</style>

      {/* Behind the course: the horizon, with the treasure island on it */}
      {kind === "horizon" && stage && (
        <div
          data-testid="horizon"
          style={{
            position: "absolute",
            left: stage.x,
            top: stage.y,
            width: stage.w,
            height: stage.h,
            borderRadius: 18,
            overflow: "hidden",
            background: palette.sky[1],
            zIndex: 0,
          }}
        >
          <div
            data-testid="island"
            data-scale={islandScale.toFixed(2)}
            style={{
              position: "absolute",
              right: "4%",
              top: waterAt - 170 * (stage.h / 320),
              width: 320 * (stage.h / 320),
              transformOrigin: "100% 100%",
              transform: `scale(${islandScale})`,
              transition: `transform ${scrollMs}ms ease-in-out`,
            }}
          >
            <TreasureIsland />
          </div>
        </div>
      )}

      <div style={{ position: "relative", height: "100%", zIndex: 1 }}>
        <Board
          task={task}
          hopper={hopper}
          result={result}
          running={running}
          caption={covering ? [] : caption}
          t={t}
          Avatar={Avatar}
          expression={mood}
          interactive={phase === "play" && !task.solved}
          hand={null}
          tapping={false}
          trail={trail}
          missed={missed}
          onAdd={(d, at) => {
            edit();
            const step = addBlock(current.current, d, at);
            commit(step.state);
            void speak(step.say);
          }}
          onMove={(from, to) => {
            edit();
            commit(moveBlock(current.current, from, to));
          }}
          onRemove={(i) => {
            edit();
            commit(removeAt(current.current, i));
          }}
          onHint={() => {
            const step = tapHint(current.current);
            commit(step.state);
            void speak(step.say);
          }}
          onPlay={async () => {
            const pressed = pressPlay(current.current);
            if ("say" in pressed) return void speak(pressed.say);
            await hop(pressed.run);
            if (!alive.current) return;
            const step = finishRun(current.current, pressed.run);
            commit(step.state);
            if (step.verdict === "solve")
              return solved(step.state, step.fixed !== undefined);
            void speak(step.say);
          }}
        />
      </div>

      {/* The horizon's foreground: stones go by as the avatar hops on */}
      {kind === "horizon" && stage && panorama && (
        <div
          data-testid="panorama"
          style={{
            position: "absolute",
            left: stage.x,
            top: stage.y,
            width: stage.w,
            height: stage.h,
            overflow: "hidden",
            borderRadius: 18,
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: waterAt,
              height: waterH,
              background: palette.sky[3],
            }}
          />
          <div
            key={scrollKey}
            style={{
              position: "absolute",
              left: 0,
              top: groundAt,
              display: "flex",
              gap: stage.w / 7,
              transform: scrolling ? `translateX(-${stage.w}px)` : undefined,
              transition: scrolling
                ? `transform ${scrollMs}ms ease-in-out`
                : undefined,
              paddingLeft: stage.w * 0.08,
            }}
          >
            {stoneRow.map((i) => (
              <div
                key={i}
                style={{
                  width: stage.w / 10,
                  height: waterH + 12,
                  borderRadius: 8,
                  background: palette.sand[6],
                  borderTop: `${stage.h * 0.04}px solid ${palette.leaf[5]}`,
                  boxSizing: "border-box",
                  flex: "0 0 auto",
                }}
              />
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              left: stage.w * 0.1,
              top: groundAt - hopperPx,
              animation: scrolling
                ? "hop-bob 340ms ease-in-out infinite"
                : undefined,
            }}
          >
            <Avatar
              expression={scrolling ? "happy" : "neutral"}
              size={hopperPx}
            />
          </div>
        </div>
      )}

      {/* The strip: the whole journey, small, beside the goal */}
      {kind === "strip" && layout && !mapShown && !covering && (
        <div
          data-testid="strip"
          style={{
            position: "absolute",
            left: layout.strip.x,
            top: layout.strip.y,
            width: layout.strip.w,
            height: layout.strip.h,
            borderRadius: 16,
            background: palette.sky[2],
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "4%",
              right: "10%",
              top: "58%",
              borderTop: `4px dashed ${palette.sand[0]}`,
            }}
          />
          {spots.map((spot, i) => (
            <div
              key={spot.x}
              data-strip-spot={i}
              style={{
                position: "absolute",
                left: `${4 + (i * 86) / spots.length}%`,
                top: "58%",
                width: 18,
                height: 18,
                marginLeft: -9,
                marginTop: -7,
                borderRadius: "50%",
                border: `3px solid ${palette.ink[9]}`,
                boxSizing: "border-box",
                background: i < done ? palette.sunshine[4] : palette.sand[0],
                animation:
                  i === done - 1 ? "hop-pop 400ms ease-out" : undefined,
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              right: 8,
              top: 8,
              bottom: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Chest open={false} size={50} />
          </div>
          <div
            data-testid="strip-avatar"
            data-at={standingAt}
            style={{
              position: "absolute",
              left: `${4 + (standingAt * 86) / spots.length}%`,
              bottom: "34%",
              marginLeft: -20,
              transition: `left ${stripWalkMs}ms ease-in-out`,
            }}
          >
            <div
              key={standingAt}
              style={{
                animation:
                  phase === "moment"
                    ? `hop-bob ${stripWalkMs / 3}ms ease-in-out 3`
                    : undefined,
              }}
            >
              <Avatar expression="neutral" size={40} />
            </div>
          </div>
        </div>
      )}

      {/* The map, over everything */}
      {kind !== "horizon" && map && (
        <div
          data-testid="map"
          data-shown={mapShown || undefined}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            overflow: "hidden",
            opacity: mapShown ? 1 : 0,
            transition: `opacity ${kind === "pull-back" ? mapFadeMs : fadeMs}ms`,
            pointerEvents: mapShown ? "auto" : "none",
            background: palette.sky[3],
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: "0 0",
              transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.s})`,
              transition: cameraMs
                ? `transform ${cameraMs}ms ease-in-out`
                : undefined,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: map.x,
                top: map.y,
                width: map.w,
                height: map.h,
              }}
            >
              <MapArt done={done} legRefs={legRefs} />
            </div>
            <div
              ref={walker}
              data-testid="walker"
              style={{
                position: "absolute",
                marginLeft: -walkerPx / 2,
                marginTop: -walkerRise - walkerPx / 2,
                pointerEvents: "none",
              }}
            >
              {/* Shrinks as the camera zooms in, so it lands at the hopper's size. */}
              <div
                style={{
                  width: walkerPx,
                  height: walkerPx,
                  lineHeight: 0,
                  transformOrigin: "50% 50%",
                  transform:
                    camera.s > 1 ? `scale(${landingPx / walkerPx})` : undefined,
                  transition: cameraMs
                    ? `transform ${cameraMs}ms ease-in-out`
                    : undefined,
                }}
              >
                <Avatar
                  expression={phase === "ending" ? "happy" : "neutral"}
                  size={walkerPx}
                />
              </div>
            </div>
          </div>
          {phase === "opening" && <p style={captionOnMap}>{goalLine}</p>}
        </div>
      )}

      {/* The horizon's opening line sits in the board's caption already. */}

      {covering && (
        <div
          data-testid="ending"
          data-chest={chest}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 4,
            background: `${palette.ink[9]}d8`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "hop-rise 300ms ease-out",
          }}
        >
          <div style={{ position: "relative", width: 340 }}>
            {chest === "open" && (
              <>
                <svg
                  viewBox="-100 -100 200 200"
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "-50%",
                    top: "-70%",
                    width: "200%",
                    animation: "hop-rays 9s linear infinite",
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <polygon
                      // biome-ignore lint/suspicious/noArrayIndexKey: fixed rays
                      key={i}
                      points="-7,0 7,0 0,-100"
                      fill={palette.sunshine[3]}
                      opacity={0.45}
                      transform={`rotate(${i * 30})`}
                    />
                  ))}
                </svg>
                {Array.from({ length: 14 }, (_, i) => {
                  const angle = (Math.PI * (i + 0.5)) / 14;
                  const coin: CSSProperties & Record<`--${string}`, string> = {
                    position: "absolute",
                    left: "47%",
                    top: "30%",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: palette.sunshine[4],
                    border: `2px solid ${palette.sunshine[7]}`,
                    "--dx": `${Math.cos(angle) * 260}px`,
                    "--dy": `${-Math.sin(angle) * 210}px`,
                    animation: `hop-coin 1.5s ${i * 0.09}s ease-out infinite`,
                  };
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed coins
                  return <div key={i} style={coin} />;
                })}
              </>
            )}
            <div style={{ position: "relative" }}>
              <Chest open={chest === "open"} size={340} />
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              right: 48,
              bottom: 48,
              pointerEvents: "none",
            }}
          >
            <Avatar expression="cheering" size={150} />
          </div>
          <p
            data-testid="ending-line"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 20,
              margin: 0,
              textAlign: "center",
              color: "white",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            {chest === "open" ? endLine : ""}
          </p>
        </div>
      )}

      {phase === "finished" && (
        <button
          type="button"
          onClick={onAgain}
          style={{
            position: "absolute",
            right: 16,
            top: 16,
            zIndex: 6,
            minHeight: 64,
            padding: "0 24px",
            fontSize: 22,
            fontWeight: 800,
            borderRadius: 16,
          }}
        >
          Play again
        </button>
      )}

      {phase === "play" && !task.solved && !running && (
        <button
          type="button"
          data-testid="lab-fill"
          onClick={() => {
            const s = current.current;
            const route = shortestRoute(s.course);
            if (route) commit({ ...s, plan: [...route] });
          }}
          style={{
            position: "absolute",
            left: 12,
            top: (stage?.y ?? 0) + (stage?.h ?? 0) + 10,
            zIndex: 2,
            fontSize: 13,
            padding: "4px 8px",
            borderRadius: 8,
          }}
        >
          Lab only: fill in the answer
        </button>
      )}
    </div>
  );
}

const captionOnMap: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 18,
  margin: 0,
  textAlign: "center",
  color: "white",
  fontSize: 26,
  fontWeight: 800,
  textShadow: `0 2px 6px ${palette.ink[9]}`,
};
