// The class timer a teacher set, or one the student set for themselves,
// around every shell page: a small clock with the time left, a spoken
// heads-up when it's nearly up, and, once it runs out, "Time's up" over
// everything. A teacher's can't be dismissed: it stays until the teacher
// clears the timer, or the platform does a while after. The student's own
// is kept in this browser, and they can put its "Time's up" away.
import { Icon } from "@repo/ui/icon";
import { IconButton } from "@repo/ui/icon-button";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { TimerPort } from "../platform/ports.ts";
import {
  clockText,
  isWarningTime,
  ownTimeUpHoldMs,
  phaseOf,
  playChime,
  soonest,
  type TimerPhase,
  timerPollMs,
} from "../play/class-timer.ts";
import type { KeyValueStore } from "../play/storage.ts";
import type { Voice, VoiceOptions } from "../play/voice.ts";
import classes from "./app.module.css";
import timer from "./class-timer.module.css";
import { ShellVoiceGate, shellT, useShellVoice } from "./shared.tsx";

interface ClassTimerState {
  phase: TimerPhase;
  /**
   * While a game is up, its voice: the heads-up waits for it to finish a
   * line, so the two never talk over each other. Returns its unsetting.
   */
  hearGame(voice: Voice): () => void;
  /** The clock grows and pulses once, for the heads-up. */
  pulse: boolean;
  pulsed(): void;
  /** Whether a teacher's timer is on, so the student can't set their own. */
  teacherRunning: boolean;
  /** Starts the student's own timer, `minutes` from now, or stops it with null. */
  setOwn(minutes: number | null): void;
}

const ClassTimerContext = createContext<ClassTimerState>({
  phase: { kind: "none" },
  hearGame: () => () => {},
  pulse: false,
  pulsed: () => {},
  teacherRunning: false,
  setOwn: () => {},
});

/** The class timer's phase, for a page that has to act on it (a game ends at time's up). */
export function useClassTimer() {
  return useContext(ClassTimerContext);
}

/** When the timer runs out, as the platform says, asked again every so often. */
function useEndsAt(port: TimerPort | undefined): number | null {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  useEffect(() => {
    if (!port) return;
    let stopped = false;
    const ask = () =>
      port.current().then(
        (current) => {
          if (!stopped) setEndsAt(current ? Date.parse(current.endsAt) : null);
        },
        // Offline, the last answer stands, so time's up still comes on time.
        (error: unknown) =>
          console.warn("[play] Couldn't check the class timer", error),
      );
    void ask();
    const poll = setInterval(ask, timerPollMs);
    const onShow = () => {
      if (document.visibilityState === "visible") void ask();
    };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("online", ask);
    return () => {
      stopped = true;
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("online", ask);
    };
  }, [port]);
  return endsAt;
}

/** Where this browser keeps when the student's own timer runs out, in ms. */
const ownKey = "own-timer.ends-at";

/** The student's own timer: when it runs out, kept in this browser. */
function useOwnEndsAt(storage: KeyValueStore | null) {
  const [endsAt, setEndsAt] = useState<number | null>(() => {
    const kept = Number(storage?.getItem(ownKey));
    // One that ran out long ago is forgotten, as a teacher's is.
    return kept > 0 && kept + ownTimeUpHoldMs > Date.now() ? kept : null;
  });
  const set = useCallback(
    (minutes: number | null) => {
      const next = minutes === null ? null : Date.now() + minutes * 60_000;
      if (next === null) storage?.removeItem(ownKey);
      else storage?.setItem(ownKey, String(next));
      setEndsAt(next);
    },
    [storage],
  );
  return [endsAt, set] as const;
}

/** The time now, a second at a time while there's a timer to count down. */
function useNow(ticking: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return;
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [ticking]);
  return now;
}

/** Settles once the voice isn't saying anything. */
function whenQuiet(voice: Voice | null): Promise<void> {
  if (!voice?.speaking) return Promise.resolve();
  return new Promise((resolve) => {
    const unlisten = voice.listen(() => {
      if (voice.speaking) return;
      unlisten();
      resolve();
    });
  });
}

export function ClassTimer({
  port,
  storage,
  corner,
  speak,
  children,
}: {
  /** None on a site without classes. */
  port?: TimerPort;
  /** Where the student's own timer is kept. */
  storage: KeyValueStore | null;
  /**
   * Show the clock in the screen's corner. A game shows it in its own rail
   * instead (`TimerClock`), clear of the game.
   */
  corner: boolean;
  speak?: VoiceOptions["speak"];
  children: ReactNode;
}) {
  const teacherEndsAt = useEndsAt(port);
  const [ownEndsAt, setOwn] = useOwnEndsAt(storage);
  const endsAt = soonest(teacherEndsAt, ownEndsAt);
  const now = useNow(endsAt !== null);
  const phase = phaseOf(teacherEndsAt, ownEndsAt, now);
  const up = phase.kind === "up";
  const teacherRunning = teacherEndsAt !== null;

  // A teacher's timer takes over: the student's own is cancelled.
  useEffect(() => {
    if (teacherRunning && ownEndsAt !== null) setOwn(null);
  }, [teacherRunning, ownEndsAt, setOwn]);

  // The student's own "Time's up" goes by itself after a while too.
  useEffect(() => {
    if (ownEndsAt !== null && now >= ownEndsAt + ownTimeUpHoldMs) setOwn(null);
  }, [ownEndsAt, now, setOwn]);

  const game = useRef<Voice | null>(null);
  const hearGame = useCallback((voice: Voice) => {
    game.current = voice;
    return () => {
      if (game.current === voice) game.current = null;
    };
  }, []);

  // The heads-up, once per timer, said between the game's lines.
  const voice = useShellVoice("en-CA", speak);
  const warned = useRef<number | null>(null);
  const [pulse, setPulse] = useState(false);
  const warning = isWarningTime(phase);
  useEffect(() => {
    if (!warning || endsAt === null || warned.current === endsAt) return;
    warned.current = endsAt;
    setPulse(true);
    void whenQuiet(game.current).then(() => voice.say("two-minutes-left"));
  }, [warning, endsAt, voice]);

  const pulsed = useCallback(() => setPulse(false), []);
  const state = useMemo(
    () => ({ phase, hearGame, pulse, pulsed, teacherRunning, setOwn }),
    [phase, hearGame, pulse, pulsed, teacherRunning, setOwn],
  );
  return (
    <ClassTimerContext.Provider value={state}>
      <div className={classes.page} inert={up}>
        {children}
      </div>
      {corner && phase.kind === "running" && (
        <div className={timer.corner}>
          <TimerClock />
        </div>
      )}
      {up && (
        <TimeUp
          speak={speak}
          onDone={phase.own ? () => setOwn(null) : undefined}
        />
      )}
    </ClassTimerContext.Provider>
  );
}

/**
 * The small clock with the time left, while a timer runs. It grows and
 * pulses once for the heads-up. `stacked` puts the time under the icon, to
 * fit a game's narrow rail.
 */
export function TimerClock({ stacked = false }: { stacked?: boolean }) {
  const { phase, pulse, pulsed } = useClassTimer();
  if (phase.kind !== "running") return null;
  const text = clockText(phase.leftMs);
  return (
    <div
      className={timer.clock}
      data-pulse={pulse || undefined}
      data-stacked={stacked || undefined}
      data-last-minute={phase.leftMs <= 60_000 || undefined}
      onAnimationEnd={pulsed}
      role="timer"
      aria-label={`${shellT("time-left")}: ${text}`}
    >
      <Icon name="clock" size={18} />
      <span aria-hidden="true">{text}</span>
    </div>
  );
}

const keyEvents = ["keydown", "keyup", "keypress"] as const;

/**
 * "Time's up", over everything: a chime, then the line. It takes all input
 * and silences every other voice and sound while it's up; the page behind
 * is inert. With `onDone` (the student's own timer), a tick puts it away.
 */
function TimeUp({
  speak,
  onDone,
}: {
  speak?: VoiceOptions["speak"];
  onDone?: () => void;
}) {
  const gate = useContext(ShellVoiceGate);
  useEffect(() => {
    gate?.close();
    return () => gate?.open();
  }, [gate]);
  return (
    // Outside the gate it closed: this is the line that's heard.
    <ShellVoiceGate.Provider value={undefined}>
      <TimeUpBlock speak={speak} onDone={onDone} />
    </ShellVoiceGate.Provider>
  );
}

function TimeUpBlock({
  speak,
  onDone,
}: {
  speak?: VoiceOptions["speak"];
  onDone?: () => void;
}) {
  const voice = useShellVoice("en-CA", speak);
  const block = useRef<HTMLDivElement>(null);
  // Browsers won't play sound before the page's first tap. Said before it,
  // the line is said again on the first tap on the block.
  const unheard = useRef(false);
  const hear = () => {
    unheard.current = false;
    voice.again();
  };

  useEffect(() => {
    unheard.current = !(navigator.userActivation?.hasBeenActive ?? true);
    // The tick, when there is one: it's last.
    const buttons = block.current?.querySelectorAll("button");
    buttons?.[buttons.length - 1]?.focus();
    let gone = false;
    void playChime().then(() => {
      if (!gone) void voice.say("time-up");
    });
    return () => {
      gone = true;
    };
  }, [voice]);

  // Keys aimed outside the block stop before anything hears them.
  useEffect(() => {
    const guard = (event: Event) => {
      if (
        !(event.target instanceof Node && block.current?.contains(event.target))
      )
        event.stopImmediatePropagation();
    };
    for (const type of keyEvents) window.addEventListener(type, guard, true);
    return () => {
      for (const type of keyEvents)
        window.removeEventListener(type, guard, true);
    };
  }, []);

  return (
    <div
      ref={block}
      className={`${classes.message} ${timer.timeUp}`}
      role="alertdialog"
      aria-modal="true"
      aria-label={shellT("time-up")}
      onClick={() => {
        if (unheard.current) hear();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      onKeyUp={(event) => event.stopPropagation()}
    >
      <Stack align="center" gap="lg">
        <Icon name="hourglass" size={96} />
        <div className={classes.question}>
          <Text size="xl">{shellT("time-up")}</Text>
          <IconButton
            tone="neutral"
            size="lg"
            label={shellT("hear-again")}
            onClick={hear}
          >
            <Icon name="speaker" size={24} />
          </IconButton>
        </div>
        {onDone && (
          <IconButton
            tone="accent"
            label={shellT("time-up-ok")}
            onClick={onDone}
          >
            <Icon name="check" size={32} />
          </IconButton>
        )}
      </Stack>
    </div>
  );
}
