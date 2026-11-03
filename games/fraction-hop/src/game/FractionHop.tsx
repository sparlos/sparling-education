// The game: the tutorial (on the student's first play only), then one trip
// across the treasure map, over six tasks. The rules live in ../rules; this
// file wires them to taps, the run's animation, the voice and the shell.
import type { AvatarExpression, GameProps } from "@repo/game-contract";
import { handMs, offerHint } from "@repo/game-kit/frame";
import { seeded } from "@repo/game-kit/random";
import { useTimers } from "@repo/game-kit/timers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Manifest, manifest } from "../manifest.ts";
import { type Run, type RunEnd, runPlan } from "../rules/course.ts";
import { generatePlay, tasksPerPlay } from "../rules/generate.ts";
import {
  addBlock,
  finishRun,
  introLines,
  moveBlock,
  pressPlay,
  removeAt,
  type Step,
  startTask,
  type TaskAttempt,
  type TaskState,
  tapHint,
  tuningLog,
} from "../rules/task.ts";
import type { StringId } from "../strings.ts";
import { Board, type Carried } from "./Board.tsx";
import { type Hopper, home, hopMs, sinkMs } from "./Course.tsx";
import {
  aimMs,
  type ChestState,
  chestOpenMs,
  chestShutMs,
  type MapCamera,
  mapFadeMs,
  settleMs,
  stillHoldMs,
  TreasureMap,
  walkMs,
  walkToChestMs,
  zoomMs,
} from "./TreasureMap.tsx";
import {
  beatMs,
  minLineMs,
  type Tap,
  tapMs,
  tutorialCourse,
  tutorialScript,
} from "./tutorial.ts";

/** The pause after "You found the goal!" before the map comes back. */
const solvedMs = 500;
/** How long the ghost hand points at a hop guided placed. */
const pointMs = 1800;
/** How long the "Nice fix!" sparkle lasts. */
const sparkleMs = 800;
/** A beat before the first hop, so the hopper is home before it takes off. */
const takeoffMs = 40;

export const runMs = (run: Run) =>
  takeoffMs +
  run.landings.length * hopMs +
  (run.end.kind === "splash" ? sinkMs : 150);

type Mode = "tutorial" | "opening" | "play" | "moment" | "done";

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export function FractionHop(props: GameProps<Manifest>) {
  const { tier, firstPlay, t, say, onAttempt, onProgress, onFinish } = props;
  const courses = useMemo(
    () => generatePlay(tier, seeded(Math.floor(Math.random() * 2 ** 31))),
    [tier],
  );
  // The tutorial plays on a first play only; a returning student starts at task 1.
  const [mode, setMode] = useState<Mode>(firstPlay ? "tutorial" : "opening");
  const [task, setTask] = useState(() => {
    const first = courses[0];
    return firstPlay || !first
      ? startTask(tier, 0, tutorialCourse)
      : startTask(tier, 1, first);
  });
  const current = useRef(task);
  const [hopper, setHopper] = useState<Hopper>(home);
  const [result, setResult] = useState<RunEnd | null>(null);
  const [running, setRunning] = useState(false);
  const [mood, setMood] = useState<AvatarExpression>("neutral");
  const [caption, setCaption] = useState<readonly StringId[]>([]);
  const [hand, setHand] = useState<string | null>(null);
  const [tapping, setTapping] = useState(false);
  const [carrying, setCarrying] = useState<Carried | null>(null);
  // The planned hop that splashed on the last run, until the plan changes.
  const [missed, setMissed] = useState<number | null>(null);
  // How many hops the run has taken off on, for its trail; kept until the plan changes.
  const [trail, setTrail] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new plan clears them
  useEffect(() => {
    setMissed(null);
    setTrail(0);
  }, [task.plan]);
  // The plan slot a "Nice fix!" sparkles on; `key` restarts each burst.
  const [sparkle, setSparkle] = useState<{ hop: number; key: number } | null>(
    null,
  );

  // The journey: the treasure map.
  const [mapShown, setMapShown] = useState(true);
  const [camera, setCamera] = useState<MapCamera>({
    view: "wide",
    moving: false,
  });
  const [spot, setSpot] = useState(0);
  const [done, setDone] = useState(0);
  const [chest, setChest] = useState<ChestState>("none");

  // Every timer, cleared together on skip, on a new task, and on unmount.
  // A pause cut short this way never resumes, which ends whatever awaited it.
  const { later, pause, clear: clearTimers } = useTimers();

  const commit = useCallback((next: TaskState) => {
    current.current = next;
    setTask(next);
  }, []);
  /** Shows the caption and says it; settles when it's been said. */
  const speak = useCallback(
    (ids: StringId[]) => {
      if (ids.length === 0) return Promise.resolve();
      setCaption(ids);
      return say(...ids);
    },
    [say],
  );

  /** Plays a run's hops; settles when the run has ended. */
  const hop = useCallback(
    (run: Run) =>
      new Promise<void>((done) => {
        setRunning(true);
        setResult(null);
        setTrail(0);
        setHopper(home);
        setMood("happy");
        let from = 0;
        for (const [key, to] of run.landings.entries()) {
          const start = from;
          later(takeoffMs + key * hopMs, () => {
            setHopper({ at: to, flight: { from: start, key }, sunk: false });
            setTrail(key + 1);
          });
          from = to;
        }
        const landed = takeoffMs + run.landings.length * hopMs;
        later(landed, () =>
          setHopper({
            at: from,
            flight: null,
            sunk: run.end.kind === "splash",
          }),
        );
        later(runMs(run), () => {
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
          done();
        });
      }),
    [later],
  );

  /** Puts a course on the board, behind the map if it's up. */
  const showCourse = useCallback(
    (index: number) => {
      clearTimers();
      const course = courses[index - 1];
      if (!course) return;
      commit(startTask(tier, index, course));
      setHopper(home);
      setResult(null);
      setRunning(false);
      setHand(null);
      setTapping(false);
      setCarrying(null);
      setSparkle(null);
    },
    [clearTimers, commit, courses, tier],
  );

  /** The task on the board begins, with its own line. */
  const beginTask = useCallback(
    (index: number) => {
      const course = courses[index - 1];
      if (!course) return;
      setMode("play");
      setMood("thinking");
      void speak(introLines(course));
    },
    [courses, speak],
  );

  /** A move of the camera or the map: none with reduced motion, where it cuts. */
  const moved = useCallback(
    (ms: number) => pause(reducedMotion() ? 0 : ms),
    [pause],
  );

  /** The camera zooms in on the character, and the map fades into the course. */
  const zoomIn = useCallback(async () => {
    setCamera({ view: "close", moving: true });
    await moved(zoomMs - mapFadeMs);
    setMapShown(false);
    await moved(mapFadeMs);
  }, [moved]);

  /**
   * The map comes back as the camera pulls away from the course's character,
   * then the character hops to the next place. No voice, and nothing to tap.
   */
  const pullBack = useCallback(
    async (index: number) => {
      setMode("moment");
      setCaption([]);
      setHand(null);
      // Unseen: the camera finds the character where the course left it.
      setCamera({ view: "close", moving: false });
      await pause(aimMs);
      setMapShown(true);
      setCamera({ view: "wide", moving: true });
      await moved(zoomMs);
      setDone(index);
      await moved(settleMs);
      setSpot(index);
      await pause(
        reducedMotion()
          ? stillHoldMs
          : index < tasksPerPlay
            ? walkMs
            : walkToChestMs,
      );
    },
    [moved, pause],
  );

  /** From the tutorial, or its skip, to the journey's opening on task 1. */
  const open = useCallback(() => {
    showCourse(1);
    setMapShown(true);
    setCamera({ view: "wide", moving: false });
    setMode("opening");
  }, [showCourse]);

  // The shell's progress bar: tasks solved out of the play's.
  useEffect(() => onProgress({ done: 0, total: tasksPerPlay }), [onProgress]);

  // The opening: the whole map, and the goal. The camera then zooms in on the
  // character, and task 1 begins.
  useEffect(() => {
    if (mode !== "opening") return;
    let cancelled = false;
    void (async () => {
      setMood("neutral");
      // With no sound, the line still holds the screen long enough to read.
      await Promise.all([speak(["journey.goal"]), pause(minLineMs)]);
      if (cancelled) return;
      setCaption([]);
      await zoomIn();
      if (!cancelled) beginTask(1);
    })();
    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [mode, speak, pause, zoomIn, beginTask, clearTimers]);

  // The tutorial: a fixed script on its own course, never recorded. Each cue
  // waits for the last, so the voice and the hand take turns.
  useEffect(() => {
    if (mode !== "tutorial") return;
    let cancelled = false;
    const doTap = async (tap: Tap) => {
      setTapping(true);
      await pause(tapMs);
      if ("to" in tap) {
        // A drag: the hand carries the block to its slot, then lets go.
        const from = "move" in tap ? tap.move : undefined;
        const d =
          from === undefined
            ? (tap as { drag: number }).drag
            : (current.current.plan[from] as number);
        setCarrying({ d, from });
        setHand(`slot-${tap.to}`);
        await pause(handMs);
        setTapping(false);
        setCarrying(null);
        setHopper(home);
        const state = current.current;
        commit(
          from === undefined
            ? addBlock(state, d, tap.to).state
            : moveBlock(state, from, tap.to),
        );
        await pause(beatMs);
        return;
      }
      setTapping(false);
      const state = current.current;
      if ("play" in tap) {
        const run = runPlan(state.course, state.plan);
        await hop(run);
        commit(finishRun(current.current, run).state);
      } else {
        setHopper(home);
        commit(
          "add" in tap
            ? addBlock(state, tap.add).state
            : removeAt(state, tap.remove),
        );
      }
      await pause(beatMs);
    };
    void (async () => {
      await pause(beatMs);
      for (const cue of tutorialScript) {
        if (cancelled) return;
        if ("say" in cue) {
          // With no sound, a line still holds the screen long enough to read.
          await Promise.all([speak([cue.say]), pause(minLineMs)]);
          await pause(beatMs);
        } else if ("point" in cue) {
          setHand(cue.point);
          await pause(cue.point ? handMs : beatMs);
        } else if ("tap" in cue) {
          await doTap(cue.tap);
        } else if (!cancelled) {
          open();
        }
      }
    })();
    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [mode, pause, speak, commit, hop, open, clearTimers]);

  /** Sends a run's attempt as it happens, so a student who leaves still leaves their tries. */
  const record = useCallback(
    (attempt: TaskAttempt | undefined) => {
      if (!attempt) return;
      onAttempt({
        ...attempt,
        // Each tier evidences one expectation.
        expectation: manifest.tiers[tier].expectations[0],
      });
    },
    [onAttempt, tier],
  );

  /**
   * After a step, the ghost hand points at any hop guided just placed. When
   * the hint button starts to glow, the result is said first; then, while
   * the hint is offered, the hand glides from the middle of the screen to
   * the button, and fades soon after so it invites a tap without demanding one.
   */
  const apply = useCallback(
    async (before: TaskState, step: Step) => {
      commit(step.state);
      record(step.attempt);
      if (step.state.locked > before.locked) {
        setHand(`slot-${step.state.locked - 1}`);
        later(pointMs, () => setHand(null));
      }
      const offer = step.say.at(-1);
      if (
        !step.state.glow ||
        before.glow ||
        (offer !== "hint.ready" && offer !== "hint.ready-again")
      )
        return speak(step.say);
      await speak(step.say.slice(0, -1));
      await offerHint({ say: () => speak([offer]), pause, setHand });
    },
    [commit, record, speak, later, pause],
  );

  const solved = async (done: TaskState, fixed: boolean) => {
    const cheer: StringId[] = fixed ? ["run.nice-fix"] : [];
    onProgress({ done: done.index, total: tasksPerPlay });
    console.info("[fraction-hop] tuning (local only)", tuningLog(done));
    await speak([...cheer, "run.solved"]);
    await pause(solvedMs);
    await pullBack(done.index);
    if (done.index < tasksPerPlay) {
      showCourse(done.index + 1);
      // The next course's character has to be on screen for the camera to find it.
      await pause(aimMs);
      await zoomIn();
      beginTask(done.index + 1);
    } else {
      setMode("done");
      setMood("cheering");
      setChest("shut");
      await pause(chestShutMs);
      setChest("open");
      await Promise.all([speak(["play.done"]), pause(chestOpenMs)]);
      onFinish();
    }
  };

  const playing = mode === "play" && !task.solved;
  const edit = () => {
    setHopper(home);
    setMood("thinking");
  };

  return (
    <Board
      task={task}
      hopper={hopper}
      result={result}
      running={running}
      caption={mode === "opening" || chest !== "none" ? [] : caption}
      t={t}
      Avatar={props.Avatar}
      expression={mood}
      interactive={playing}
      hand={hand}
      tapping={tapping}
      carrying={carrying}
      sparkle={sparkle}
      missed={missed}
      trail={trail}
      onSkip={mode === "tutorial" ? open : undefined}
      overlay={
        mode === "tutorial" ? undefined : (
          <TreasureMap
            shown={mapShown}
            camera={camera}
            spot={spot}
            done={done}
            chest={chest}
            line={
              mode === "opening" || chest === "open"
                ? caption.map(t).join(" ")
                : ""
            }
            Avatar={props.Avatar}
          />
        )
      }
      onAdd={(d, at) => {
        const before = current.current;
        edit();
        void apply(before, addBlock(before, d, at));
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
        setHand(null);
        void apply(current.current, tapHint(current.current));
      }}
      onPlay={async () => {
        const pressed = pressPlay(current.current);
        if ("say" in pressed) return void speak(pressed.say);
        await hop(pressed.run);
        const before = current.current;
        const step = finishRun(before, pressed.run);
        // The fixed hop sparkles as the run ends, before the cheer is said.
        if (step.fixed !== undefined) {
          setSparkle({ hop: step.fixed, key: Date.now() });
          later(sparkleMs, () => setSparkle(null));
        }
        if (step.verdict === "solve") {
          commit(step.state);
          record(step.attempt);
          await solved(step.state, step.fixed !== undefined);
        } else {
          void apply(before, step);
        }
      }}
    />
  );
}
