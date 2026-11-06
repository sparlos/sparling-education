// What the class timer a teacher set, or the student's own, means for the
// student right now: how long they have, or that time's up. The screens are
// in ../ui/ClassTimer.tsx.

/** How often the shell asks whether a teacher set, changed or cleared a timer. */
export const timerPollMs = 20_000;

/** The longest a timer can be set for, in whole minutes from 1: a teacher's, or the student's own. */
export const timerMaxMinutes = 120;

/** The whole minutes typed, or null when it isn't a length a timer can have. */
export function parseMinutes(typed: string): number | null {
  const trimmed = typed.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const minutes = Number(trimmed);
  return minutes >= 1 && minutes <= timerMaxMinutes ? minutes : null;
}

/**
 * How long "Time's up" stays for a timer the student set themselves, unless
 * they put it away first: as long as the platform keeps a teacher's.
 */
export const ownTimeUpHoldMs = 5 * 60_000;

/** When the student hears that time's nearly up. */
export const warnAtMs = 2 * 60_000;

/**
 * A warning this late is skipped: a student who opens a page with less than
 * this left past the warning just sees the clock.
 */
const warnWithinMs = 15_000;

export type TimerPhase =
  | { kind: "none" }
  | { kind: "running"; leftMs: number }
  /** `own`: only the student's own timer is up, so they can put it away. */
  | { kind: "up"; own: boolean };

/**
 * The phase at `now`, from when the teacher's timer and the student's own
 * run out (null: there's none). The one that ends sooner counts; a
 * teacher's that's up can't be put away, even with the student's up too.
 */
export function phaseOf(
  teacher: number | null,
  own: number | null,
  now: number,
): TimerPhase {
  const teacherUp = teacher !== null && now >= teacher;
  const ownUp = own !== null && now >= own;
  if (teacherUp || ownUp) return { kind: "up", own: !teacherUp };
  const ends = [teacher, own].filter((t): t is number => t !== null);
  if (ends.length === 0) return { kind: "none" };
  return { kind: "running", leftMs: Math.min(...ends) - now };
}

/** The sooner of the two timers' ends, or null when there's neither. */
export function soonest(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

/** Whether it's the moment to warn that time's nearly up. */
export function isWarningTime(phase: TimerPhase): boolean {
  return (
    phase.kind === "running" &&
    phase.leftMs <= warnAtMs &&
    phase.leftMs > warnAtMs - warnWithinMs
  );
}

/** The small clock's text: "12 min", then "0:45" in the last minute. */
export function clockText(leftMs: number): string {
  if (leftMs > 60_000) return `${Math.ceil(leftMs / 60_000)} min`;
  const seconds = Math.ceil(leftMs / 1000);
  return `0:${String(Math.min(seconds, 59)).padStart(2, "0")}`;
}

/**
 * A short two-note chime, made with Web Audio so the shell needs no sound
 * file. Settles once it has rung, at once where audio isn't available or
 * the browser hasn't allowed it yet.
 */
export function playChime(): Promise<void> {
  const Context = globalThis.AudioContext;
  if (!Context) return Promise.resolve();
  try {
    const context = new Context();
    if (context.state !== "running") {
      void context.close();
      return Promise.resolve();
    }
    const notes = [
      { hz: 784, at: 0 }, // G5
      { hz: 1047, at: 0.22 }, // C6
    ];
    for (const { hz, at } of notes) {
      const tone = context.createOscillator();
      const level = context.createGain();
      tone.type = "sine";
      tone.frequency.value = hz;
      const start = context.currentTime + at;
      level.gain.setValueAtTime(0, start);
      level.gain.linearRampToValueAtTime(0.25, start + 0.02);
      level.gain.exponentialRampToValueAtTime(0.001, start + 0.9);
      tone.connect(level).connect(context.destination);
      tone.start(start);
      tone.stop(start + 0.9);
    }
    return new Promise((resolve) =>
      setTimeout(() => {
        void context.close();
        resolve();
      }, 1100),
    );
  } catch {
    return Promise.resolve();
  }
}
