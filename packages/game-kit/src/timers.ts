// Timing for a game's scripted moments (tutorials, results, nudges).
//
// The voice and on-screen actions take turns: `await say(...)`, then act,
// then say the next line. Never guess a line's length with a fixed timer.
// Timers here are only for the pauses between turns and for animation, and
// they're plain `setTimeout`s, so tests drive them with Vitest's fake timers.
import { useCallback, useEffect, useRef } from "react";

export interface Timers {
  /** Runs `fn` after `ms`, unless the timers are cleared first. */
  later(ms: number, fn: () => void): void;
  /**
   * Settles after `ms`. A pause cut short by `clear` never settles, which
   * ends whatever awaited it, so a skipped script stops where it was.
   */
  pause(ms: number): Promise<void>;
  /** Cancels every pending timer. Also runs on unmount. */
  clear(): void;
}

export function useTimers(): Timers {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const pause = useCallback(
    (ms: number) => new Promise<void>((resolve) => later(ms, resolve)),
    [later],
  );
  const clear = useCallback(() => {
    for (const id of timers.current) clearTimeout(id);
    timers.current = [];
  }, []);
  useEffect(() => clear, [clear]);
  const api = useRef<Timers>({ later, pause, clear });
  return api.current;
}
