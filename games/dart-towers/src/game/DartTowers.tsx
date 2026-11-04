// The game: the tutorial (on the student's first play only), then one night of
// six waves. The rules live in ../rules; this file wires them to taps, the
// volley, the voice and the shell.
//
// The voice and the screen take turns: `await speak(...)` before acting on what
// was said, never a timer guessed from a line's length.
import type { AvatarExpression, GameProps } from "@repo/game-contract";
import { handMs, offerHint } from "@repo/game-kit/frame";
import { seeded } from "@repo/game-kit/random";
import { useTimers } from "@repo/game-kit/timers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Manifest } from "../manifest.ts";
import type { Outcome } from "../rules/judge.ts";
import { partLabel } from "../rules/teacher.ts";
import { volleyAt } from "../rules/volley.ts";
import {
  arrivalLine,
  canFire,
  canHint,
  deleteDigit,
  hintGlows,
  landed,
  laneCounts,
  missLine,
  partShowsAnswer,
  pressFire,
  solvedLine,
  startWave,
  tapHint,
  tryAgain,
  typeDigit,
  type WaveState,
} from "../rules/wave.ts";
import { generatePlay, wavesPerPlay } from "../rules/waves.ts";
import type { StringId } from "../strings.ts";
import { Board } from "./Board.tsx";
import { captionText } from "./caption.ts";
import {
  type EffectSound,
  flightMs,
  reducedMotion,
  type VolleyPlan,
} from "./Effects.tsx";
import { Field } from "./Field.tsx";
import {
  beatMs,
  extraDarts,
  minLineMs,
  rightDarts,
  tapMs,
  tutorialWave,
} from "./tutorial.ts";

/** The volley's length: at one speed all through, and never long. */
export const volleyMs = (darts: number) => Math.min(2600, 900 + darts * 6);
/** Volley frames: the counter and the swarm move this often. */
const frameMs = 60;
/** What's left of the swarm charging at the wall, then the moment it hits. */
const chargeMs = 650;
const thudMs = 250;
export const marchMs = chargeMs + thudMs;
/** Sparkles and the avatar's hop, once every bug is stopped, before the voice. */
export const clearMs = 700;
/** The sky moving between waves, with no voice and nothing to tap. */
export const momentMs = 1500;
/** The same moment with reduced motion: the sky changes in one step, then holds. */
const stillMomentMs = 500;
/** The end: the view tilting up and the sun rising. */
export const endingMs = 5000;
/** How loud the sound of a stopped wave plays, here and at sunrise. */
const waveClearVolume = 0.6;

type Mode = "tutorial" | "opening" | "play" | "moment" | "ending";

export function DartTowers(props: GameProps<Manifest>) {
  const {
    tier,
    firstPlay,
    t,
    say,
    onAttempt,
    onProgress,
    onFinish,
    Avatar,
    playSound,
  } = props;
  const waves = useMemo(
    () => generatePlay(tier, seeded(Math.floor(Math.random() * 2 ** 31))),
    [tier],
  );
  const [mode, setMode] = useState<Mode>(firstPlay ? "tutorial" : "opening");
  const [state, setState] = useState<WaveState>(() =>
    startWave(tier, 0, tutorialWave),
  );
  const current = useRef(state);
  // Whether a swarm is on the field: none before a wave arrives or after it's done.
  const [hasSwarm, setHasSwarm] = useState(firstPlay);
  const [spent, setSpent] = useState(0);
  const [loaded, setLoaded] = useState<number | null>(null);
  const [marched, setMarched] = useState(false);
  const [wallHit, setWallHit] = useState(false);
  const [volley, setVolley] = useState<VolleyPlan | null>(null);
  const [clearing, setClearing] = useState(false);
  const [wavesDone, setWavesDone] = useState(0);
  const [mood, setMood] = useState<AvatarExpression>("neutral");
  const [caption, setCaption] = useState<readonly StringId[]>([]);
  const [hand, setHand] = useState<string | null>(null);
  const [tapping, setTapping] = useState(false);
  const { later, pause, clear: clearTimers } = useTimers();

  const commit = useCallback((next: WaveState) => {
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

  /** A wave's picture back to how it arrived. */
  const resetPicture = useCallback(() => {
    setSpent(0);
    setLoaded(null);
    setMarched(false);
    setWallHit(false);
    setVolley(null);
    setClearing(false);
  }, []);

  /** The darts fly: from when the first lands, the counter runs down at one speed, whatever's in the way. */
  const fly = useCallback(
    (darts: number) =>
      new Promise<void>((done) => {
        setLoaded(darts);
        if (reducedMotion()) {
          setSpent(darts);
          done();
          return;
        }
        const ms = volleyMs(darts);
        setVolley({ darts, ms });
        const landing = ms - flightMs;
        const frames = Math.ceil(landing / frameMs);
        for (let f = 1; f <= frames; f++)
          later(flightMs + (f * landing) / frames, () =>
            setSpent(Math.round((darts * f) / frames)),
          );
        later(ms, () => {
          setVolley(null);
          done();
        });
      }),
    [later],
  );

  /** What's left of the swarm charges the wall, which takes the hit and turns red. */
  const march = useCallback(async () => {
    const still = reducedMotion();
    setMarched(true);
    await pause(still ? 0 : chargeMs);
    setWallHit(true);
    await pause(still ? 0 : thudMs);
  }, [pause]);

  const arrive = useCallback(
    (index: number) => {
      const wave = waves[index - 1];
      if (!wave) return;
      commit(startWave(tier, index, wave));
      resetPicture();
      setHasSwarm(true);
      setHand(null);
      setTapping(false);
      setMode("play");
      setMood("thinking");
      void speak(arrivalLine(wave, index === 1));
    },
    [commit, resetPicture, speak, tier, waves],
  );

  // The shell's progress bar: waves done out of the play's.
  useEffect(() => onProgress({ done: 0, total: wavesPerPlay }), [onProgress]);

  // A returning student, or a skipped tutorial: the goal, then wave 1.
  useEffect(() => {
    if (mode !== "opening") return;
    let cancelled = false;
    void (async () => {
      // With no sound, the line still holds the screen long enough to read.
      await Promise.all([speak(["play.goal"]), pause(minLineMs)]);
      if (!cancelled) arrive(1);
    })();
    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [mode, speak, pause, arrive, clearTimers]);

  /** The tutorial's Skip: the mended field, then the goal and wave 1. */
  const skip = useCallback(() => {
    clearTimers();
    resetPicture();
    setHasSwarm(false);
    setHand(null);
    setTapping(false);
    setMode("opening");
  }, [clearTimers, resetPicture]);

  // The tutorial: a fixed script on its own tiny wave, never recorded. Each
  // step waits for the last, so the voice and the volley take turns.
  useEffect(() => {
    if (mode !== "tutorial") return;
    let cancelled = false;
    const line = async (ids: StringId[]) => {
      await Promise.all([speak(ids), pause(minLineMs)]);
      await pause(beatMs);
    };
    const tapOn = async (target: string) => {
      setHand(target);
      await pause(handMs);
      setTapping(true);
      await pause(tapMs);
      setTapping(false);
    };
    /** The hand types the number and presses Fire, and the darts fly. */
    const load = async (darts: number) => {
      await tapOn(`key-${darts}`);
      commit({ ...current.current, typed: String(darts) });
      await tapOn("main");
      setHand(null);
      setMood("neutral");
      await fly(darts);
      await pause(beatMs);
    };
    void (async () => {
      setMood("thinking");
      await line(["tutorial.one-dart"]);
      if (cancelled) return;
      await load(rightDarts);
      if (cancelled) return;
      setMood("cheering");
      await pause(beatMs);
      commit({ ...current.current, typed: "" });
      resetPicture();
      setMood("thinking");
      await pause(beatMs);
      if (cancelled) return;
      await load(extraDarts);
      if (cancelled) return;
      setMood("encouraging");
      await line(["tutorial.extras"]);
      if (cancelled) return;
      // The glass mends. A first play hears the goal here, so no one misses it.
      commit({ ...current.current, typed: "" });
      setHasSwarm(false);
      await line(["tutorial.your-turn", "play.goal"]);
      if (!cancelled) arrive(1);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, speak, pause, fly, commit, resetPicture, arrive]);

  /** After every bug is stopped: the sky moves on, then the next wave or the end. */
  const solved = async (done: WaveState) => {
    onProgress({ done: done.index, total: wavesPerPlay });
    setMood("cheering");
    if (!reducedMotion()) {
      setClearing(true);
      playSound("wave-clear", { volume: waveClearVolume });
      await pause(clearMs);
      setClearing(false);
    }
    await speak(solvedLine(done.wave));
    setCaption([]);
    setHasSwarm(false);
    setWavesDone(done.index);
    if (done.index < wavesPerPlay) {
      setMode("moment");
      setMood("neutral");
      await pause(reducedMotion() ? stillMomentMs : momentMs);
      arrive(done.index + 1);
    } else {
      setMode("ending");
      setMood("cheering");
      playSound("wave-clear", { rate: 0.75, volume: waveClearVolume });
      await Promise.all([
        speak(["play.done"]),
        pause(reducedMotion() ? minLineMs : endingMs),
      ]);
      onFinish();
    }
  };

  /** After a miss: the result, then on the first, the offer of a hint. */
  const missed = async (outcome: Outcome) => {
    const first = current.current.misses === 1;
    setMood("encouraging");
    await speak(missLine(outcome));
    // They may have moved on while it was said.
    if (
      first &&
      current.current.phase === "missed" &&
      hintGlows(current.current)
    )
      await offerHint({ say: () => speak(["hint.ready"]), pause, setHand });
  };

  const fire = async () => {
    const fired = pressFire(current.current);
    if (!fired) return;
    commit(fired.state);
    // Sent as it happens, so a student who leaves still leaves their tries.
    onAttempt(fired.attempt);
    setHand(null);
    setMood("neutral");
    await fly(fired.darts);
    if (fired.outcome === "short") await march();
    const after = landed(current.current, fired.outcome);
    commit(after);
    if (fired.outcome === "exact") await solved(after);
    else await missed(fired.outcome);
  };

  const again = () => {
    commit(tryAgain(current.current));
    resetPicture();
    setHand(null);
    setMood("thinking");
    void speak(["wave.ask"]);
  };

  const typing = mode === "play" && state.phase === "typing";
  const typed = state.typed === "" ? null : Number(state.typed);
  // Once a volley is loaded, the counter runs down from it. It's empty between waves.
  const darts = !hasSwarm ? null : loaded !== null ? loaded - spent : typed;

  const shown = hasSwarm
    ? {
        wave: state.wave,
        volley: volleyAt(state.wave, spent),
        spent,
        marched,
        answers: state.wave.parts.map((_, i) => partShowsAnswer(state, i)),
        counts: laneCounts(state),
      }
    : null;

  const missedNow = mode === "play" && state.phase === "missed";
  return (
    <Board
      t={t}
      field={
        <Field
          shown={shown}
          volley={volley}
          wallHit={wallHit}
          clearing={clearing}
          sound={(id: EffectSound, rate?: number) =>
            playSound(id, { rate, volume: id === "dart-fire" ? 0.45 : 0.8 })
          }
          night={wavesDone / wavesPerPlay}
          ending={mode === "ending"}
          endLine={t("play.done")}
          Avatar={Avatar}
          expression={mood}
          label={state.wave.parts.map(partLabel).join(", ")}
        />
      }
      caption={mode === "ending" ? "" : captionText(caption, t)}
      darts={darts}
      padOff={!typing}
      main={
        missedNow
          ? { label: t("ui.try-again"), onTap: again, disabled: false }
          : {
              label: t("ui.fire"),
              onTap: () => void fire(),
              disabled: !(mode === "play" && canFire(state)),
            }
      }
      hint={{
        onTap: () => {
          setHand(null);
          const step = tapHint(current.current);
          commit(step.state);
          void speak(step.say);
        },
        disabled: !(mode === "play" && canHint(state)),
        glow: mode === "play" && hintGlows(state),
      }}
      onDigit={(d) => {
        commit(typeDigit(current.current, d));
        setMood("thinking");
      }}
      onDelete={() => {
        commit(deleteDigit(current.current));
        setMood("thinking");
      }}
      onSkip={mode === "tutorial" ? skip : undefined}
      hand={hand}
      tapping={tapping}
      stageOnly={mode === "ending"}
    />
  );
}
