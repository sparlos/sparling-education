// The game: the tutorial, then six tasks. The rules live in ../rules; this
// file wires them to taps, the run's animation, the voice and the shell.
import type { AvatarExpression, GameProps } from "@repo/game-contract";
import { seeded } from "@repo/game-kit/random";
import { useTimers } from "@repo/game-kit/timers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Manifest, manifest } from "../manifest.ts";
import { type Run, type RunEnd, runPlan } from "../rules/course.ts";
import { generatePlay, tasksPerPlay } from "../rules/generate.ts";
import {
  addBlock,
  attemptFor,
  finishRun,
  introLines,
  moveBlock,
  pressPlay,
  removeAt,
  type Step,
  startTask,
  type TaskState,
  tapHint,
  tuningLog,
} from "../rules/task.ts";
import type { StringId } from "../strings.ts";
import { Board, type Carried } from "./Board.tsx";
import { type Hopper, home, hopMs, sinkMs } from "./Course.tsx";
import {
  beatMs,
  handMs,
  minLineMs,
  type Tap,
  tapMs,
  tutorialCourse,
  tutorialScript,
} from "./tutorial.ts";

/** The pause after "You found the goal!" before the next course. */
const solvedMs = 800;
/** The pause after the last line of the play before the shell takes over. */
const doneMs = 1500;
/** How long the ghost hand points at a hop guided placed. */
const pointMs = 1800;
/** How long the hand shows in the middle of the screen before gliding to the hint button. */
const nudgeMs = 450;
/** How long it rests on the hint button after offering the hint, before fading. */
const nudgeHoldMs = 2000;
/** How long the "Nice fix!" sparkle lasts. */
const sparkleMs = 800;
/** A beat before the first hop, so the hopper is home before it takes off. */
const takeoffMs = 40;

export const runMs = (run: Run) =>
  takeoffMs +
  run.landings.length * hopMs +
  (run.end.kind === "splash" ? sinkMs : 150);

type Mode = "tutorial" | "play" | "done";

export function FractionHop(props: GameProps<Manifest>) {
  const { tier, t, say, onAttempt, onProgress, onFinish } = props;
  const courses = useMemo(
    () => generatePlay(tier, seeded(Math.floor(Math.random() * 2 ** 31))),
    [tier],
  );
  const [mode, setMode] = useState<Mode>("tutorial");
  const [task, setTask] = useState(() => startTask(tier, 0, tutorialCourse));
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

  const beginTask = useCallback(
    (index: number) => {
      clearTimers();
      const course = courses[index - 1];
      if (!course) return;
      commit(startTask(tier, index, course));
      setMode("play");
      setHopper(home);
      setResult(null);
      setRunning(false);
      setHand(null);
      setTapping(false);
      setCarrying(null);
      setSparkle(null);
      setMood("thinking");
      void speak([
        ...(index > 1 ? (["task.next"] as const) : []),
        ...introLines(course),
      ]);
    },
    [clearTimers, commit, courses, speak, tier],
  );

  // The shell's progress bar: tasks solved out of the play's.
  useEffect(() => onProgress({ done: 0, total: tasksPerPlay }), [onProgress]);

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
          beginTask(1);
        }
      }
    })();
    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [mode, pause, speak, commit, hop, beginTask, clearTimers]);

  /**
   * After a step, the ghost hand points at any hop guided just placed. When
   * the hint button starts to glow, the result is said first; then, while
   * the hint is offered, the hand glides from the middle of the screen to
   * the button, and fades soon after so it invites a tap without demanding one.
   */
  const apply = useCallback(
    async (before: TaskState, step: Step) => {
      commit(step.state);
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
      setHand("center");
      const offered = speak([offer]);
      await pause(nudgeMs);
      setHand((at) => (at === "center" ? "hint" : at));
      await Promise.all([offered, pause(handMs)]);
      await pause(nudgeHoldMs);
      setHand((at) => (at === "hint" ? null : at));
    },
    [commit, speak, later, pause],
  );

  const solved = async (done: TaskState, fixed: boolean) => {
    const cheer: StringId[] = fixed ? ["run.nice-fix"] : [];
    onAttempt({
      ...attemptFor(done),
      // Each tier evidences one expectation.
      expectation: manifest.tiers[tier].expectations[0],
      succeeded: true,
    });
    onProgress({ done: done.index, total: tasksPerPlay });
    console.info("[fraction-hop] tuning (local only)", tuningLog(done));
    if (done.index < tasksPerPlay) {
      await speak([...cheer, "run.solved"]);
      await pause(solvedMs);
      beginTask(done.index + 1);
    } else {
      setMode("done");
      await speak([...cheer, "run.solved", "play.done"]);
      await pause(doneMs);
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
      caption={caption}
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
      onSkip={mode === "tutorial" ? () => beginTask(1) : undefined}
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
          await solved(step.state, step.fixed !== undefined);
        } else {
          void apply(before, step);
        }
      }}
    />
  );
}
