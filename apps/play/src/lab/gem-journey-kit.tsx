// Crystal Machine's real board and rules, with a giant gem built over one play:
// six jobs, six shards. The three gem-* prototypes differ only in where the gem
// sits and how the moment between jobs plays. The Board is laid over from the
// outside, so the game's code doesn't change for a prototype. Rough; see README.md.
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
import crystalDrop from "../../../../games/crystal-machine/audio/crystal-drop.ogg";
import crystalMerge from "../../../../games/crystal-machine/audio/crystal-merge.ogg";
import { Board } from "../../../../games/crystal-machine/src/game/Board.tsx";
import { captionText } from "../../../../games/crystal-machine/src/game/caption.ts";
import type { Shown } from "../../../../games/crystal-machine/src/game/GemLayer.tsx";
import { landingRate } from "../../../../games/crystal-machine/src/game/gems.ts";
import {
  framesFor,
  runLength,
} from "../../../../games/crystal-machine/src/game/playback.ts";
import {
  choose,
  deleteDigit,
  finishRun,
  type JobState,
  jobLines,
  pressRun,
  startJob,
  tapHint,
  typeDigit,
} from "../../../../games/crystal-machine/src/rules/job.ts";
import {
  chutesFor,
  generatePlay,
  jobsPerPlay,
  type TierId,
} from "../../../../games/crystal-machine/src/rules/jobs.ts";
import type { MachineRun } from "../../../../games/crystal-machine/src/rules/machine.ts";
import {
  type StringId,
  strings,
} from "../../../../games/crystal-machine/src/strings.ts";
import { seeded } from "../../../../packages/game-kit/src/random.ts";
import { wait } from "./add-sub-kit.tsx";
import type { PrototypeMeta, PrototypeProps } from "./prototype.ts";

export const gemGrounding = {
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
        "For 160 with the hundreds closed, setting 6 tens and 0 ones: the machine makes 60, and the shard doesn't come.",
    },
    {
      id: "zero-not-a-place",
      fails:
        "For 607, setting 6 tens and 7 ones: the machine makes 67, and the shard doesn't come.",
    },
  ],
  sampleTask:
    "math-2020.g5.B1.1's example of 10 620 as 106 hundreds and 20 ones, as in the built game.",
} satisfies Partial<PrototypeMeta>;

export type GemJourneyKind = "strip" | "case" | "pull-back";

const goalLine = "Let's build a giant crystal!";
const endLine = "You made the giant crystal! Great work!";

const leverMs = 300;
const solvedMs = 500;
const moveMs = 500;
const riseMs = 280;
const flightMs = 850;
const landMs = 450;
const endingMs = 5000;
const caseWidth = 168;
/** The gem's height against its width. */
const gemRatio = 0.9;

/** The six shards, from the tip up, with the top last: viewBox 0 0 100 90. */
const shards = [
  { points: "34,34 66,34 50,86", fill: palette.violet[5] },
  { points: "4,34 34,34 50,86", fill: palette.violet[6] },
  { points: "66,34 96,34 50,86", fill: palette.violet[7] },
  { points: "4,34 28,6 34,34", fill: palette.violet[3] },
  { points: "72,6 96,34 66,34", fill: palette.violet[4] },
  { points: "28,6 72,6 66,34 34,34", fill: palette.violet[2] },
] as const;

function GemArt({ filled, only }: { filled: number; only?: number }) {
  return (
    <svg
      viewBox="0 0 100 90"
      style={{ display: "block", width: "100%", overflow: "visible" }}
      aria-hidden="true"
    >
      {shards.map((shard, i) =>
        only !== undefined && i !== only ? null : (
          <polygon
            key={shard.points}
            points={shard.points}
            fill={i < filled || only === i ? shard.fill : palette.sand[0]}
            stroke={
              i < filled || only === i ? palette.ink[9] : palette.violet[7]
            }
            strokeWidth={1.5}
            strokeDasharray={i < filled || only === i ? undefined : "4 3"}
            strokeLinejoin="round"
          />
        ),
      )}
    </svg>
  );
}

interface Rect {
  x: number;
  y: number;
  w: number;
}

interface Layout {
  machine: { x: number; y: number; w: number; h: number };
  big: Rect;
  seat: Rect;
  from: Rect;
}

function measure(root: HTMLElement, kind: GemJourneyKind): Layout | null {
  const el = root.querySelector('[data-testid="machine"]');
  if (!el) return null;
  const box = root.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const machine = {
    x: r.left - box.left,
    y: r.top - box.top,
    w: r.width,
    h: r.height,
  };
  const bigW = Math.min((machine.h * 0.82) / gemRatio, 430);
  const centre = { x: machine.x + machine.w / 2, y: machine.y + machine.h / 2 };
  const seatW = 66;
  return {
    machine,
    big: {
      x: centre.x - bigW / 2,
      y: centre.y - (bigW * gemRatio) / 2,
      w: bigW,
    },
    seat:
      kind === "case"
        ? {
            x: machine.x + machine.w + 16,
            y: machine.y + machine.h * 0.3,
            w: caseWidth - 24,
          }
        : { x: machine.x + machine.w - seatW - 12, y: 8, w: seatW },
    from: { x: centre.x - 110, y: centre.y - 100, w: 220 },
  };
}

const at = (rect: Rect, ms: number): CSSProperties => ({
  position: "absolute",
  left: rect.x,
  top: rect.y,
  width: rect.w,
  transition: `left ${ms}ms ease-in-out, top ${ms}ms ease-in-out, width ${ms}ms ease-in-out`,
  pointerEvents: "none",
});

function play(url: string, rate: number, volume = 1) {
  const audio = new Audio(url);
  audio.preservesPitch = false;
  audio.playbackRate = rate;
  audio.volume = volume;
  void audio.play().catch(() => {});
}

type Phase = "opening" | "play" | "moment" | "ending" | "finished";

export function GemJourney({
  kind,
  grade,
  Avatar,
  speak: speakText,
}: PrototypeProps & { kind: GemJourneyKind }) {
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
}: PrototypeProps & { kind: GemJourneyKind; onAgain(): void }) {
  const tier = `g${Math.max(3, Math.min(5, grade))}` as TierId;
  const chutes = chutesFor[tier];
  const jobs = useMemo(
    () => generatePlay(tier, seeded(Math.floor(Math.random() * 2 ** 31))),
    [tier],
  );
  const first = jobs[0];
  if (!first) throw new Error("A play has jobs");
  const [state, setState] = useState<JobState>(() => startJob(tier, 1, first));
  const current = useRef(state);
  const still = useCallback(
    (): Shown => ({
      tubes: Array.from({ length: chutes + 1 }, () => 0),
      fused: [],
      paced: false,
    }),
    [chutes],
  );
  const [shown, setShown] = useState<Shown>(still);
  const [running, setRunning] = useState(false);
  const [mood, setMood] =
    useState<ComponentProps<typeof Board>["expression"]>("neutral");
  const [caption, setCaption] = useState<readonly StringId[]>([]);
  const [flash, setFlash] = useState(0);
  const [phase, setPhase] = useState<Phase>("opening");
  const [filled, setFilled] = useState(0);
  const [pose, setPose] = useState<"big" | "seat">("big");
  const [scrim, setScrim] = useState(true);
  const [flyer, setFlyer] = useState<{
    shard: number;
    landing: boolean;
  } | null>(null);
  const [pulse, setPulse] = useState(0);
  const [layout, setLayout] = useState<Layout | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const update = () => setLayout(measure(el, kind));
    update();
    const watch = new ResizeObserver(update);
    watch.observe(el);
    const machine = el.querySelector('[data-testid="machine"]');
    if (machine) watch.observe(machine);
    return () => watch.disconnect();
  }, [kind]);

  const t = useCallback(
    (id: StringId) => (strings as Record<string, string>)[id] ?? id,
    [],
  );

  /** Shows the caption, says it, and waits about as long as it takes to say. */
  const speak = useCallback(
    async (ids: readonly StringId[]) => {
      if (ids.length === 0) return;
      setCaption(ids);
      const text = captionText(ids, t);
      speakText(text.replace(/(\d) (\d)/g, "$1$2"));
      await wait(Math.max(700, text.length * 62));
    },
    [speakText, t],
  );

  const commit = useCallback(
    (next: JobState) => {
      current.current = next;
      setState(next);
      if (next.made === null)
        setShown((now) => (now.tubes.some((n) => n > 0) ? still() : now));
    },
    [still],
  );

  const beginJob = useCallback(
    (index: number) => {
      const job = jobs[index - 1];
      if (!job) return;
      commit(startJob(tier, index, job));
      setShown(still());
      setPhase("play");
      setMood("thinking");
      void speak(jobLines(job));
    },
    [commit, jobs, speak, still, tier],
  );

  // The opening: the whole gem, empty, and the goal. Then it moves to its seat.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, as the play opens
  useEffect(() => {
    void (async () => {
      await wait(400);
      await speak([goalLine as StringId]);
      if (!alive.current) return;
      setPose("seat");
      setScrim(false);
      await wait(600);
      if (alive.current) beginJob(1);
    })();
  }, []);

  /** The shard rises from the machine and flies into the gem. */
  const moment = useCallback(
    async (index: number) => {
      const began = performance.now();
      setPhase("moment");
      if (kind === "pull-back") {
        setPose("big");
        setScrim(true);
        await wait(moveMs);
      }
      setShown(still());
      setFlyer({ shard: index - 1, landing: false });
      play(crystalMerge, 0.7);
      await wait(riseMs);
      setFlyer({ shard: index - 1, landing: true });
      await wait(flightMs);
      setFlyer(null);
      setFilled(index);
      setPulse((n) => n + 1);
      play(crystalMerge, 1.2 + index * 0.08);
      await wait(landMs);
      if (kind === "pull-back" && index < jobsPerPlay) {
        setPose("seat");
        setScrim(false);
        await wait(moveMs);
      }
      console.info(
        `[gem journey] moment ${index}: ${Math.round(performance.now() - began)} ms`,
      );
    },
    [kind, still],
  );

  const solved = async (done: JobState) => {
    setMood("happy");
    await speak(["run.solved"]);
    await wait(solvedMs);
    if (!alive.current) return;
    setCaption([]);
    await moment(done.index);
    if (!alive.current) return;
    if (done.index < jobsPerPlay) return beginJob(done.index + 1);
    setPhase("ending");
    setMood("cheering");
    setPose("big");
    setScrim(true);
    play(crystalMerge, 0.6);
    const said = speak([endLine as StringId]);
    await Promise.all([said, wait(endingMs)]);
    if (alive.current) setPhase("finished");
  };

  const runMachine = (run: MachineRun) =>
    new Promise<void>((done) => {
      const frames = framesFor(run);
      setRunning(true);
      setShown(still());
      setMood("neutral");
      for (const frame of frames)
        window.setTimeout(() => {
          setShown({
            tubes: frame.tubes,
            fused: frame.fused,
            paced: frame.paced,
          });
          if (frame.chain >= 2) setMood("happy");
        }, leverMs + frame.at);
      window.setTimeout(() => {
        setRunning(false);
        done();
      }, leverMs + runLength(frames));
    });

  const lastDrop = useRef(0);
  const gemEvents = useMemo(
    () => ({
      landed: (place: Parameters<typeof landingRate>[0]) => {
        const now = performance.now();
        if (now - lastDrop.current < 60) return;
        lastDrop.current = now;
        play(crystalDrop, landingRate(place), 0.7);
      },
      fused: () => play(crystalMerge, 1),
    }),
    [],
  );

  const pointer = layout && (pose === "big" ? layout.big : layout.seat);
  const covering = phase === "ending" || phase === "finished";
  const jobsDone = covering ? jobsPerPlay : filled;

  return (
    <div
      ref={root}
      data-testid="gem-journey"
      data-phase={phase}
      data-filled={filled}
      data-pose={pose}
      style={{ position: "relative", height: "100%", overflow: "hidden" }}
    >
      <style>{`
        ${kind === "case" ? `[data-testid="gem-journey"] [data-testid="machine"] { margin-right: ${caseWidth}px; }` : ""}
        @keyframes gem-pulse { 40% { transform: scale(1.14); filter: brightness(1.35); } }
        @keyframes gem-rise { from { transform: scale(0.2); opacity: 0; } }
        @keyframes gem-rays { to { transform: rotate(360deg); } }
        @keyframes gem-breathe { 50% { transform: scale(1.06); filter: brightness(1.25); } }
        @keyframes gem-twinkle { 0%, 100% { transform: scale(0.2); opacity: 0; } 50% { transform: scale(1); opacity: 1; } }
      `}</style>
      <Board
        gemEvents={gemEvents}
        state={state}
        shown={shown}
        running={running}
        caption={covering ? [] : caption}
        t={t}
        Avatar={Avatar}
        expression={mood}
        interactive={phase === "play" && !state.solved}
        hand={null}
        tapping={false}
        counterFlash={flash}
        onChoose={(p) => {
          const step = choose(current.current, p);
          commit(step.state);
          setMood("thinking");
          void speak(step.say);
        }}
        onDigit={(d) => {
          commit(typeDigit(current.current, d));
          setMood("thinking");
        }}
        onDelete={() => {
          commit(deleteDigit(current.current));
          setMood("thinking");
        }}
        onHint={() => {
          const step = tapHint(current.current);
          commit(step.state);
          void speak(step.say);
        }}
        onRun={async () => {
          const pressed = pressRun(current.current);
          if ("refused" in pressed) {
            commit(pressed.step.state);
            setMood("encouraging");
            if (pressed.refused === "too-many") setFlash((k) => k + 1);
            return void speak(pressed.step.say);
          }
          await runMachine(pressed.run);
          if (!alive.current) return;
          const step = finishRun(current.current, pressed.run);
          commit(step.state);
          if (step.verdict === "solve") return solved(step.state);
          setMood("encouraging");
          void speak(step.say);
        }}
      />

      {layout && kind === "case" && !covering && (
        <div
          style={{
            position: "absolute",
            left: layout.machine.x + layout.machine.w + 4,
            top: layout.machine.y,
            width: caseWidth - 4,
            height: layout.machine.h,
            borderRadius: 20,
            background: palette.sand[1],
            border: `3px solid ${palette.sand[6]}`,
            boxSizing: "border-box",
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 28,
              right: 28,
              top: `${(layout.machine.h * 0.3 + (caseWidth - 24) * gemRatio + 8).toFixed(0)}px`,
              height: 22,
              borderRadius: 6,
              background: palette.sand[6],
            }}
          />
        </div>
      )}

      {layout && (
        <div
          style={{
            position: "absolute",
            ...(covering
              ? { inset: 0 }
              : {
                  left: layout.machine.x,
                  top: layout.machine.y,
                  width: layout.machine.w + (kind === "case" ? caseWidth : 0),
                  height: layout.machine.h,
                  borderRadius: 20,
                }),
            background: `${palette.ink[9]}e0`,
            zIndex: 3,
            opacity: scrim ? 1 : 0,
            transition: `opacity ${moveMs}ms`,
            pointerEvents: scrim ? "auto" : "none",
          }}
        />
      )}

      {pointer && layout && (
        <div
          data-testid="big-gem"
          style={{
            ...at(pointer, phase === "opening" ? 600 : moveMs),
            zIndex: 4,
          }}
        >
          {covering && (
            <>
              <svg
                viewBox="-100 -100 200 200"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "-50%",
                  top: "-55%",
                  width: "200%",
                  animation: "gem-rays 9s linear infinite",
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
              {Array.from({ length: 8 }, (_, i) => {
                const angle = (i / 8) * 2 * Math.PI;
                return (
                  <svg
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed sparkles
                    key={i}
                    viewBox="-10 -10 20 20"
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: `${46 + 62 * Math.cos(angle)}%`,
                      top: `${42 + 62 * Math.sin(angle)}%`,
                      width: "9%",
                      animation: `gem-twinkle 1.4s ${i * 0.17}s infinite`,
                    }}
                  >
                    <path
                      d="M0 -10 L2.5 -2.5 L10 0 L2.5 2.5 L0 10 L-2.5 2.5 L-10 0 L-2.5 -2.5 Z"
                      fill={palette.sunshine[3]}
                    />
                  </svg>
                );
              })}
            </>
          )}
          <div
            key={pulse}
            style={{
              position: "relative",
              animation: covering
                ? "gem-breathe 1.6s ease-in-out infinite"
                : pulse
                  ? `gem-pulse ${landMs}ms ease-out`
                  : undefined,
            }}
          >
            <GemArt filled={jobsDone} />
          </div>
        </div>
      )}

      {flyer && layout && pointer && (
        <div
          data-testid="shard"
          style={{
            ...at(flyer.landing ? pointer : layout.from, flightMs),
            zIndex: 5,
          }}
        >
          <div
            style={{
              animation: `gem-rise ${riseMs}ms ease-out`,
              filter: `drop-shadow(0 0 12px ${palette.sunshine[3]})`,
            }}
          >
            <GemArt filled={0} only={flyer.shard} />
          </div>
        </div>
      )}

      {covering && (
        <>
          <div
            style={{
              position: "absolute",
              right: 48,
              bottom: 48,
              zIndex: 5,
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
              zIndex: 5,
              textAlign: "center",
              color: "white",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            {endLine}
          </p>
        </>
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

      {phase === "play" && !state.solved && !running && (
        <button
          type="button"
          data-testid="lab-fill"
          onClick={() => {
            const s = current.current;
            commit({ ...s, plan: [...s.job.answer], made: null });
          }}
          style={{
            position: "absolute",
            left: 12,
            bottom: 14,
            zIndex: 2,
            fontSize: 13,
            padding: "6px 10px",
            borderRadius: 8,
          }}
        >
          Lab only: fill in the answer
        </button>
      )}
    </div>
  );
}
