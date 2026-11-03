// The game: the tutorial (on the student's first play only), then one giant
// crystal built over six jobs. The rules live in ../rules; this file wires them to taps, the
// machine's run, the voice and the shell.
//
// The voice and the screen take turns, never both at once: `await speak(...)`
// before acting on what was said, never a timer guessed from a line's length.
import type { AvatarExpression, GameProps } from "@repo/game-contract";
import { handMs, offerHint } from "@repo/game-kit/frame";
import { seeded } from "@repo/game-kit/random";
import { useTimers } from "@repo/game-kit/timers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Manifest } from "../manifest.ts";
import {
  choose,
  deleteDigit,
  finishRun,
  type JobAttempt,
  type JobState,
  jobLines,
  pressRun,
  type Step,
  startJob,
  tapHint,
  tuningLog,
  typeDigit,
} from "../rules/job.ts";
import { chutesFor, generatePlay, jobsPerPlay } from "../rules/jobs.ts";
import type { MachineRun } from "../rules/machine.ts";
import type { Place, StringId } from "../strings.ts";
import { Board } from "./Board.tsx";
import { captionText } from "./caption.ts";
import type { Shown } from "./GemLayer.tsx";
import {
  type CrystalPose,
  endingMs,
  flightMs,
  GiantCrystal,
  growMs,
  landMs,
  riseMs,
  stillHoldMs,
} from "./GiantCrystal.tsx";
import { landingRate } from "./gems.ts";
import { framesFor, runLength } from "./playback.ts";
import {
  beatMs,
  type Cue,
  minLineMs,
  type Tap,
  tapMs,
  tutorialJobs,
  tutorialScript,
} from "./tutorial.ts";

/** The lever's pull before the first crystal drops. */
export const leverMs = 300;
/** The pause after "Job done!" before the crystal grows. */
const solvedMs = 500;
/** How low the fusing sound plays as a shard rises. */
const shardRiseRate = 0.7;
/** How high it plays as the first shard lands; each one after is a little higher. */
const shardLandRate = 1.2;
const shardLandStep = 0.08;
/** How low it plays as the ending begins. */
const endingRate = 0.6;
/** How long the ghost hand points at a chute guided set. */
const pointMs = 1800;

type Mode = "tutorial" | "opening" | "play" | "done";

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

const emptyTubes = (chutes: number) =>
  Array.from({ length: chutes + 1 }, () => 0);
/** Empty tubes, nothing fusing. */
const still = (chutes: number): Shown => ({
  tubes: emptyTubes(chutes),
  fused: [],
  paced: false,
});

export function CrystalMachine(props: GameProps<Manifest>) {
  const {
    tier,
    firstPlay,
    t,
    say,
    playSound,
    onAttempt,
    onProgress,
    onFinish,
  } = props;
  const chutes = chutesFor[tier];
  const jobs = useMemo(
    () => generatePlay(tier, seeded(Math.floor(Math.random() * 2 ** 31))),
    [tier],
  );
  const tutorial = useMemo(() => tutorialJobs(chutes), [chutes]);
  // The tutorial plays on a first play only; a returning student starts at job 1.
  const [mode, setMode] = useState<Mode>(firstPlay ? "tutorial" : "opening");
  const [state, setState] = useState<JobState>(() =>
    firstPlay
      ? startJob(tier, 0, tutorial[0])
      : startJob(tier, 1, jobs[0] ?? tutorial[0]),
  );
  const current = useRef(state);
  // What the tubes hold, frame by frame through a run.
  const [shown, setShown] = useState<Shown>(() => still(chutes));
  const [running, setRunning] = useState(false);
  const [mood, setMood] = useState<AvatarExpression>("neutral");
  const [caption, setCaption] = useState<readonly StringId[]>([]);
  const [hand, setHand] = useState<string | null>(null);
  const [tapping, setTapping] = useState(false);
  const [counterFlash, setCounterFlash] = useState(0);
  // The journey: the giant crystal.
  const [pose, setPose] = useState<CrystalPose>("big");
  const [dimmed, setDimmed] = useState(true);
  const [filled, setFilled] = useState(0);
  const [shard, setShard] = useState<{
    index: number;
    flying: boolean;
  } | null>(null);
  const [pulse, setPulse] = useState(0);
  const [ending, setEnding] = useState(false);

  // Every timer, cleared together on skip, on a new job, and on unmount.
  // A pause cut short this way never resumes, which ends whatever awaited it.
  const { later, pause, clear: clearTimers } = useTimers();

  const commit = useCallback(
    (next: JobState) => {
      current.current = next;
      setState(next);
      // A changed plan empties the tubes; the windows go blank with them.
      if (next.made === null)
        setShown((now) => (now.tubes.some((n) => n > 0) ? still(chutes) : now));
    },
    [chutes],
  );

  /** Shows the caption and says it; settles when it's been said. */
  const speak = useCallback(
    (ids: StringId[]) => {
      if (ids.length === 0) return Promise.resolve();
      setCaption(ids);
      return say(...ids);
    },
    [say],
  );

  /** Plays a run: the lever, then the crystals; settles when the machine stops. */
  const play = useCallback(
    (run: MachineRun) =>
      new Promise<void>((done) => {
        const frames = framesFor(run);
        setRunning(true);
        setShown(still(run.plan.length));
        setMood("neutral");
        for (const frame of frames)
          later(leverMs + frame.at, () => {
            setShown({
              tubes: frame.tubes,
              fused: frame.fused,
              paced: frame.paced,
            });
            // A chain of fuses is the payoff.
            if (frame.chain >= 2) setMood("happy");
          });
        later(leverMs + runLength(frames), () => {
          setRunning(false);
          done();
        });
      }),
    [later],
  );

  const beginJob = useCallback(
    (index: number) => {
      clearTimers();
      const job = jobs[index - 1];
      if (!job) return;
      commit(startJob(tier, index, job));
      setMode("play");
      setShown(still(chutes));
      setRunning(false);
      setHand(null);
      setTapping(false);
      setMood("thinking");
      void speak(jobLines(job));
    },
    [chutes, clearTimers, commit, jobs, speak, tier],
  );

  /** A move of the crystal: none with reduced motion, where it cuts. */
  const moved = useCallback(() => pause(reducedMotion() ? 0 : growMs), [pause]);

  /**
   * The moment between jobs, and the last shard's before the ending: the
   * crystal grows over the machine and job `index`'s shard goes in. No voice,
   * nothing to tap, and it never takes longer than the spec's limit.
   */
  const shardIn = useCallback(
    async (index: number) => {
      setCaption([]);
      setHand(null);
      setPose("big");
      setDimmed(true);
      await moved();
      setShown(still(chutes));
      if (reducedMotion()) {
        setFilled(index);
        await pause(stillHoldMs);
      } else {
        const shardAt = index - 1;
        setShard({ index: shardAt, flying: false });
        playSound("crystal-merge", { rate: shardRiseRate });
        await pause(riseMs);
        setShard({ index: shardAt, flying: true });
        await pause(flightMs);
        setShard(null);
        setFilled(index);
        setPulse((n) => n + 1);
        playSound("crystal-merge", {
          rate: shardLandRate + index * shardLandStep,
        });
        await pause(landMs);
      }
    },
    [chutes, moved, pause, playSound],
  );

  /** From the tutorial, or its skip, to the journey's opening on job 1. */
  const open = useCallback(() => {
    const job = jobs[0];
    if (!job) return;
    commit(startJob(tier, 1, job));
    setShown(still(chutes));
    setRunning(false);
    setHand(null);
    setTapping(false);
    setMode("opening");
  }, [chutes, commit, jobs, tier]);

  // The shell's progress bar: jobs done out of the play's.
  useEffect(() => onProgress({ done: 0, total: jobsPerPlay }), [onProgress]);

  // The opening: the empty crystal over the machine, and the goal. It then
  // shrinks to its place in the top row, and job 1 begins.
  useEffect(() => {
    if (mode !== "opening") return;
    let cancelled = false;
    void (async () => {
      setPose("big");
      setDimmed(true);
      setMood("neutral");
      // With no sound, the line still holds the screen long enough to read.
      await Promise.all([speak(["journey.goal"]), pause(minLineMs)]);
      if (cancelled) return;
      setPose("seat");
      setDimmed(false);
      await moved();
      if (!cancelled) beginJob(1);
    })();
    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [mode, speak, pause, moved, beginJob, clearTimers]);

  // The tutorial: a fixed script on its own jobs, never recorded. Each cue
  // waits for the last, so the voice and the hand take turns.
  useEffect(() => {
    if (mode !== "tutorial") return;
    let cancelled = false;
    const line = async (ids: StringId[]) => {
      // With no sound, a line still holds the screen long enough to read.
      await Promise.all([speak(ids), pause(minLineMs)]);
      await pause(beatMs);
    };
    const doTap = async (tap: Tap) => {
      setTapping(true);
      await pause(tapMs);
      setTapping(false);
      const s = current.current;
      if ("chute" in tap) commit(choose(s, tap.chute).state);
      else if ("key" in tap) commit(typeDigit(s, tap.key));
      else {
        const pressed = pressRun(s);
        if (!("run" in pressed)) return;
        if (tap.say) await line(tap.say);
        if (cancelled) return;
        await play(pressed.run);
        commit(finishRun(current.current, pressed.run).state);
      }
      await pause(beatMs);
    };
    const step = async (cue: Cue) => {
      if ("say" in cue) await line(cue.say);
      else if ("point" in cue) {
        setHand(cue.point);
        await pause(cue.point ? handMs : beatMs);
      } else if ("tap" in cue) await doTap(cue.tap);
      else if ("next" in cue) {
        commit(startJob(tier, 0, tutorial[1]));
        setShown(still(chutes));
      } else open();
    };
    void (async () => {
      await pause(beatMs);
      for (const cue of tutorialScript(chutes)) {
        if (cancelled) return;
        await step(cue);
      }
    })();
    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [
    mode,
    pause,
    speak,
    commit,
    play,
    open,
    clearTimers,
    tier,
    tutorial,
    chutes,
  ]);

  /** Sends a run's attempt as it happens, so a student who leaves still leaves their tries. */
  const record = useCallback(
    (attempt: JobAttempt) => onAttempt(attempt),
    [onAttempt],
  );

  /**
   * After a step, the ghost hand points at any chute guided just set. When
   * the hint button starts to glow, the result is said first; then, while
   * the hint is offered, the hand glides from the middle of the screen to
   * the button, and fades soon after so it invites a tap without demanding one.
   */
  const apply = useCallback(
    async (before: JobState, step: Step) => {
      commit(step.state);
      const set = step.state.locked.at(-1);
      if (
        step.state.locked.length > before.locked.length &&
        set !== undefined
      ) {
        setHand(`chute-${set}`);
        later(pointMs, () =>
          setHand((at) => (at === `chute-${set}` ? null : at)),
        );
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
    [commit, speak, later, pause],
  );

  const solved = async (done: JobState) => {
    onProgress({ done: done.index, total: jobsPerPlay });
    console.info("[crystal-machine] tuning (local only)", tuningLog(done));
    setMood("happy");
    await speak(["run.solved"]);
    await pause(solvedMs);
    await shardIn(done.index);
    if (done.index < jobsPerPlay) {
      setPose("seat");
      setDimmed(false);
      await moved();
      beginJob(done.index + 1);
    } else {
      setMode("done");
      setMood("cheering");
      setEnding(true);
      playSound("crystal-merge", { rate: endingRate });
      await Promise.all([speak(["play.done"]), pause(endingMs)]);
      onFinish();
    }
  };

  const playing = mode === "play" && !state.solved;

  const gemEvents = useMemo(
    () => ({
      landed: (place: Place) =>
        playSound("crystal-drop", { rate: landingRate(place) }),
      fused: () => playSound("crystal-merge"),
    }),
    [playSound],
  );

  return (
    <Board
      gemEvents={gemEvents}
      state={state}
      shown={shown}
      running={running}
      caption={ending ? [] : caption}
      t={t}
      Avatar={props.Avatar}
      expression={mood}
      interactive={playing}
      hand={hand}
      tapping={tapping}
      counterFlash={counterFlash}
      onSkip={mode === "tutorial" ? open : undefined}
      operatorAway={ending}
      overlay={
        mode === "tutorial" ? undefined : (
          <GiantCrystal
            pose={pose}
            filled={filled}
            shard={shard}
            pulse={pulse}
            dimmed={dimmed}
            ending={ending}
            line={captionText(caption, t)}
            Avatar={props.Avatar}
          />
        )
      }
      onChoose={(p: Place) => {
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
        setHand(null);
        void apply(current.current, tapHint(current.current));
      }}
      onRun={async () => {
        const pressed = pressRun(current.current);
        if ("refused" in pressed) {
          commit(pressed.step.state);
          setMood("encouraging");
          if (pressed.refused === "too-many") setCounterFlash((k) => k + 1);
          return void speak(pressed.step.say);
        }
        setHand(null);
        await play(pressed.run);
        const before = current.current;
        const step = finishRun(before, pressed.run);
        record(step.attempt);
        if (step.verdict === "solve") {
          commit(step.state);
          await solved(step.state);
        } else {
          setMood("encouraging");
          void apply(before, step);
        }
      }}
    />
  );
}
