// The game: one climb up the mountain. The tutorial (on the student's first
// play only), then six laps, with the camera pulling back between them. The
// rules live in ../rules; this file wires them to taps, the
// train's run, the replay, the voice and the shell.
//
// The voice and the screen take turns, never both at once: `await speak(...)`
// before acting on what was said, never a timer guessed from a line's length.
import type { AvatarExpression, GameProps } from "@repo/game-contract";
import { handMs, offerHint } from "@repo/game-kit/frame";
import { seeded } from "@repo/game-kit/random";
import { useTimers } from "@repo/game-kit/timers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Manifest } from "../manifest.ts";
import { type DemoStep, demoFor } from "../rules/demo.ts";
import { generatePlay, lapsPerPlay } from "../rules/generate.ts";
import { answerOf, type Lap, type Run } from "../rules/lap.ts";
import {
  afterDemo,
  demoEndLines,
  finishGo,
  type GoResult,
  go,
  type Key,
  type LapState,
  lapLines,
  press,
  startLap,
  tapHelp,
  tuningLog,
  typedUnits,
} from "../rules/task.ts";
import type { StringId } from "../strings.ts";
import { Board } from "./Board.tsx";
import type { StationMoment, TrainView } from "./Climb.tsx";
import {
  beatsFor,
  pullMs,
  rollMs,
  tallyText,
  tinyMs,
  zoomMs,
} from "./playback.ts";
import type { ReplayView } from "./Replay.tsx";
import { gateOf, startAt, summit, valley, waitingFor } from "./track.ts";
import {
  beatMs,
  type Cue,
  minLineMs,
  tapMs,
  tutorialLap,
  tutorialScript,
} from "./tutorial.ts";

/** The pause after "It made it!" before the next lap. */
const solvedMs = 800;
/** The pause after the last line of the play before the shell takes over. */
const doneMs = 1500;
/** Ticks of the roof's number as crates go on or off at a station. */
const ticks = 6;

type Mode = "tutorial" | "play" | "done";

const atStart: TrainView = {
  at: startAt,
  ms: 0,
  stalled: false,
  waving: false,
};

/** The roof's number before a run: what the train will leave with, or ? if that's not typed yet. */
const idleRoof = (state: LapState): number | null =>
  state.lap.missing.what === "start"
    ? typedUnits(state.typed, state.lap.dp)
    : state.lap.start;

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export function CargoLine(props: GameProps<Manifest>) {
  const { tier, firstPlay, t, say, onAttempt, onProgress, onFinish } = props;
  const laps = useMemo(
    () => generatePlay(tier, seeded(Math.floor(Math.random() * 2 ** 31))),
    [tier],
  );
  // The tutorial plays on a first play only; a returning student starts at lap 1.
  const [mode, setMode] = useState<Mode>(firstPlay ? "tutorial" : "play");
  const [state, setState] = useState<LapState>(() =>
    firstPlay
      ? startLap(tier, 0, tutorialLap)
      : startLap(tier, 1, laps[0] ?? tutorialLap),
  );
  const current = useRef(state);
  // What Go tests is said once a play, unless the tutorial has just shown it.
  const stakesDue = useRef(true);
  // The camera: close on the stretch, or back on the whole mountain.
  const [near, setNear] = useState(false);
  const [climbing, setClimbing] = useState(!firstPlay);
  const [jump, setJump] = useState(false);
  const [tiny, setTiny] = useState(valley);
  const [cleared, setCleared] = useState(0);
  const [atTop, setAtTop] = useState(false);
  const [train, setTrain] = useState<TrainView>(atStart);
  // A number shown on the roof instead of the idle one: during a run, and
  // after the replay. Hidden while the train carries what's being worked out.
  const [roof, setRoof] = useState<number | null | "idle" | "hidden">("idle");
  // The trip's sum, built up during a run and left up until the number changes.
  const [tally, setTally] = useState<string | null>(null);
  const [moment, setMoment] = useState<StationMoment | null>(null);
  const [checking, setChecking] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [demoing, setDemoing] = useState(false);
  const [replay, setReplay] = useState<{
    step: DemoStep;
    view: ReplayView;
  } | null>(null);
  const [mood, setMood] = useState<AvatarExpression>("neutral");
  const [caption, setCaption] = useState<readonly StringId[]>([]);
  const [hand, setHand] = useState<string | null>(null);
  const [tapping, setTapping] = useState(false);

  // Every timer, cleared together on the tutorial's skip, on a new lap, and on
  // unmount. A pause cut short this way never resumes, which ends whatever
  // awaited it.
  const { later, pause, clear: clearTimers } = useTimers();

  // The tutorial's skip takes the camera straight to the first trip.
  const skipped = useRef(false);
  /** Lets the camera move again after the tutorial's skip. */
  const freshMove = useCallback(() => {
    skipped.current = false;
    setJump(false);
  }, []);
  /** A pause for the camera, short with reduced motion, and none after a skip. */
  const moveMs = useCallback(
    (ms: number) =>
      skipped.current
        ? Promise.resolve()
        : pause(reducedMotion() ? Math.min(ms, 200) : ms),
    [pause],
  );

  const commit = useCallback((next: LapState) => {
    current.current = next;
    setState(next);
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

  /**
   * Plays a run; settles when the train has stopped. `stakes` says what's
   * being tested before it leaves.
   */
  const play = useCallback(
    async (lap: Lap, run: Run, stakes = false) => {
      const hide = lap.missing.what === "end";
      let done = 0;
      setRunning(true);
      // The last result is over; it mustn't read as this run's.
      setCaption([]);
      setGateOpen(false);
      setMood("neutral");
      setTrain(atStart);
      setRoof(hide ? "hidden" : run.start);
      setTally(tallyText(lap, run, 0));
      setMoment(null);
      setChecking(false);
      if (stakes) await speak(["run.stakes"]);
      await pause(beatMs / 2);
      setTrain({ ...atStart, waving: true });
      for (const beat of beatsFor(lap, run, reducedMotion())) {
        if (beat.kind === "drive") {
          setTrain((now) => ({ ...now, at: beat.to, ms: beat.ms }));
        } else if (beat.kind === "station") {
          done += 1;
          setTally(tallyText(lap, run, done));
          setMoment({
            station: beat.station,
            amount: Math.abs(beat.after - beat.before),
          });
          if (!hide)
            for (let k = 1; k <= ticks; k++)
              later((beat.ms * k) / (ticks + 2), () =>
                setRoof(
                  Math.round(
                    beat.before + ((beat.after - beat.before) * k) / ticks,
                  ),
                ),
              );
        } else if (beat.kind === "stall") {
          setTally(tallyText(lap, run, done, true));
          setTrain((now) => ({ ...now, stalled: true }));
        } else if (beat.kind === "check") {
          setChecking(true);
        } else {
          setChecking(false);
          setGateOpen(beat.open);
          if (beat.open) {
            setMood("cheering");
            setTally(tallyText(lap, run, done, true));
            setRoof(run.end.load);
          }
        }
        await pause(beat.ms);
        if (beat.kind === "station") {
          setMoment(null);
          setMood("happy");
        }
      }
      setRunning(false);
    },
    [later, pause, speak],
  );

  /** A pad key. A changed number rolls the train back down to the start, ready to go again. */
  const pressKey = useCallback(
    (key: Key) => {
      const before = current.current;
      const next = press(before, key);
      if (before.lastRun && !next.lastRun) {
        setTrain({ ...atStart, ms: reducedMotion() ? 0 : rollMs });
        setGateOpen(false);
        setTally(null);
      }
      commit(next);
      setRoof("idle");
    },
    [commit],
  );

  /**
   * Pulls back to the whole mountain, climbs the tiny train towards trip
   * `index`, zooms in on its stretch, and tells the trip.
   */
  const climbTo = useCallback(
    async (index: number) => {
      const lap = laps[index - 1];
      if (!lap) return;
      setMode("play");
      setClimbing(true);
      setCaption([]);
      setHand(null);
      setTapping(false);
      setNear(false);
      await moveMs(pullMs);
      setTiny(waitingFor(index));
      await moveMs(tinyMs);
      commit(startLap(tier, index, lap));
      setTrain(atStart);
      setGateOpen(false);
      setRoof("idle");
      setTally(null);
      setMoment(null);
      setChecking(false);
      setReplay(null);
      setDemoing(false);
      setRunning(false);
      setNear(true);
      await moveMs(zoomMs);
      setClimbing(false);
      setMood("thinking");
      void speak(lapLines(lap));
    },
    [commit, laps, moveMs, speak, tier],
  );

  // The shell's progress bar: laps done out of the play's.
  useEffect(() => onProgress({ done: 0, total: lapsPerPlay }), [onProgress]);

  // A returning student opens on the mountain, hears the goal, and climbs.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, as the game opens
  useEffect(() => {
    if (firstPlay) return;
    void (async () => {
      // With no sound, the line still holds the screen long enough to read.
      await Promise.all([speak(["climb.goal"]), pause(minLineMs)]);
      await climbTo(1);
    })();
  }, []);

  // The tutorial: a fixed script on its own lap, never recorded. Each cue
  // waits for the last, so the voice and the hand take turns.
  useEffect(() => {
    if (mode !== "tutorial") return;
    let cancelled = false;
    const line = async (ids: StringId[]) => {
      // With no sound, a line still holds the screen long enough to read.
      await Promise.all([speak(ids), pause(minLineMs)]);
      await pause(beatMs);
    };
    const tap = async () => {
      setTapping(true);
      await pause(tapMs);
      setTapping(false);
    };
    const step = async (cue: Cue) => {
      if ("say" in cue) await line(cue.say);
      else if ("zoom" in cue) {
        setNear(true);
        await moveMs(zoomMs);
      } else if ("rollBack" in cue) await pause(rollMs);
      else if ("point" in cue) {
        setHand(cue.point);
        await pause(cue.point ? handMs : beatMs);
      } else if ("key" in cue) {
        await tap();
        pressKey(cue.key);
        await pause(beatMs);
      } else if ("go" in cue) {
        await tap();
        const run = go(current.current);
        if (!run) return;
        await play(current.current.lap, run);
        if (cancelled) return;
        const result = finishGo(current.current, run);
        commit(result.state);
        await line(result.say);
      } else {
        stakesDue.current = false;
        freshMove();
        await climbTo(1);
      }
    };
    void (async () => {
      await pause(beatMs);
      for (const cue of tutorialScript) {
        if (cancelled) return;
        await step(cue);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, pause, moveMs, speak, commit, pressKey, play, climbTo, freshMove]);

  /**
   * Says a miss's result. When the hint button starts to glow, the result
   * is said first, then the hint is offered.
   */
  const sayMiss = useCallback(
    async (before: LapState, result: GoResult) => {
      const offer = result.say.at(-1);
      if (!result.state.glow || before.glow || offer !== "hint.ready")
        return speak(result.say);
      await speak(result.say.slice(0, -1));
      await offerHint({ say: () => speak(["hint.ready"]), pause, setHand });
    },
    [speak, pause],
  );

  /** "Let's work it out together": each step, a column at a time, each line said before it's shown. */
  const runDemo = useCallback(
    async (lap: Lap) => {
      setDemoing(true);
      setHand(null);
      const steps = demoFor(lap);
      for (const [i, step] of steps.entries()) {
        setReplay({ step, view: { step: i, column: -1, phase: "look" } });
        await pause(beatMs * 2);
        for (const [j, col] of step.worked.entries()) {
          setReplay({ step, view: { step: i, column: j, phase: "look" } });
          await speak([col.say]);
          if (col.trade) {
            setReplay({ step, view: { step: i, column: j, phase: "trade" } });
            await speak([step.step.op === "+" ? "demo.carry" : "demo.trade"]);
          }
          setReplay({ step, view: { step: i, column: j, phase: "done" } });
          await pause(beatMs);
        }
        await pause(beatMs * 2);
      }
      setReplay(null);
      setTrain(atStart);
      setGateOpen(false);
      setTally(null);
      commit(afterDemo(current.current));
      setRoof(answerOf(lap));
      setMood("thinking");
      await speak(demoEndLines(lap));
      setDemoing(false);
    },
    [commit, pause, speak],
  );

  const solved = async (done: LapState) => {
    onProgress({ done: done.index, total: lapsPerPlay });
    console.info("[cargo-line] tuning (local only)", tuningLog(done));
    setMood("cheering");
    setCleared(done.index);
    setTiny(gateOf(done.index));
    await speak(["run.solved"]);
    await pause(solvedMs);
    freshMove();
    if (done.index < lapsPerPlay) return climbTo(done.index + 1);
    // The last gate: pull back and climb to the summit.
    setMode("done");
    setClimbing(true);
    setCaption([]);
    setNear(false);
    await moveMs(pullMs);
    setTiny(summit);
    await moveMs(tinyMs);
    setClimbing(false);
    setAtTop(true);
    await speak(["play.done"]);
    await pause(doneMs);
    onFinish();
  };

  const onGo = async () => {
    const before = current.current;
    const run = go(before);
    if (!run) return;
    setHand(null);
    const stakes = stakesDue.current;
    stakesDue.current = false;
    await play(before.lap, run, stakes);
    const result = finishGo(before, run);
    // Sent as it happens, so a student who leaves mid-lap keeps their tries.
    onAttempt(result.attempt);
    // The pad stays off from here: the replay follows the result's line.
    if (result.startDemo) setDemoing(true);
    commit(result.state);
    if (result.verdict === "solve") return solved(result.state);
    setMood("encouraging");
    await sayMiss(before, result);
    if (result.startDemo) await runDemo(before.lap);
  };

  const playing = mode === "play" && !state.solved && !demoing && !climbing;

  /** The tutorial's skip: straight to the first trip, the camera jumping there. */
  const skipTutorial = () => {
    clearTimers();
    skipped.current = true;
    setJump(true);
    void climbTo(1);
  };

  return (
    <Board
      state={state}
      train={train}
      roof={roof === "idle" ? idleRoof(state) : roof}
      gateOpen={gateOpen}
      tally={tally}
      moment={moment}
      checking={checking}
      running={running}
      caption={caption}
      t={t}
      Avatar={props.Avatar}
      expression={mood}
      interactive={playing}
      replay={replay}
      hand={hand}
      tapping={tapping}
      onSkip={mode === "tutorial" ? skipTutorial : undefined}
      near={near}
      jump={jump}
      tiny={tiny}
      cleared={cleared}
      atTop={atTop}
      onKey={(k) => {
        pressKey(k);
        setMood("thinking");
      }}
      onHelp={() => {
        setHand(null);
        const step = tapHelp(current.current);
        commit(step.state);
        void speak(step.say);
      }}
      onGo={() => void onGo()}
    />
  );
}
