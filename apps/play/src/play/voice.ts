// Plays a string's voice line: the build-time recording when there is one,
// browser speech otherwise, and nothing if neither works (no grade requires
// sound, so a silent device still plays).
import type { Locale } from "@repo/game-contract";

export interface Voice {
  /**
   * Says one or more lines in a row, as one instruction: "This gap needs" +
   * "three fourths" + "of a plank." Settles when the instruction has been
   * said, is cut off by another one, or can't be played.
   */
  say(...ids: string[]): Promise<void>;
  /** Replays the last instruction, every line of it, for the "hear it again" control. */
  again(): void;
  stop(): void;
  /** The lines of the last instruction, if any. */
  readonly last: readonly string[] | null;
}

/** A recording that's playing. */
export interface PlayingLine {
  stop(): void;
  /** Settles when the recording finishes, so the next line can follow it. */
  ended: Promise<void>;
}

export interface VoiceOptions {
  text(id: string): string;
  locale: Locale;
  /**
   * The URL of a string's build-time recording, if it has one (see
   * `resolveLineUrl`). Lines without one use browser speech.
   */
  lineUrl?(id: string): string | undefined;
  /** Starts a recording; rejects if it can't play. */
  playLine?(url: string): Promise<PlayingLine>;
  /**
   * Speaks text with browser speech, calling `onEnd` when it's done. Returns
   * a function that stops it, or null if speech is unavailable.
   */
  speak?(text: string, locale: Locale, onEnd?: () => void): (() => void) | null;
}

/**
 * Some browsers never fire speech's `end` event, so an instruction said with
 * browser speech settles after this long at the latest.
 */
export const speechTimeoutMs = (text: string) => 2000 + 120 * text.length;

export function createVoice(options: VoiceOptions): Voice {
  const playLine = options.playLine ?? browserPlayLine;
  const speak = options.speak ?? browserSpeak;
  let last: readonly string[] | null = null;
  let stopCurrent: (() => void) | null = null;
  let settleCurrent: (() => void) | null = null;
  let generation = 0;

  function stop() {
    generation += 1;
    stopCurrent?.();
    stopCurrent = null;
    // A cut-off instruction has settled too.
    settleCurrent?.();
    settleCurrent = null;
  }

  function play(ids: readonly string[]): Promise<void> {
    stop();
    const mine = generation;
    return new Promise<void>((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const settle = () => {
        clearTimeout(timer);
        if (settleCurrent === settle) settleCurrent = null;
        resolve();
      };
      settleCurrent = settle;
      // Browser speech says the whole instruction as one sentence, which
      // sounds better than separate utterances.
      const fallback = (from = 0) => {
        if (mine !== generation) return settle();
        const text = ids.slice(from).map(options.text).join(" ");
        stopCurrent = speak(text, options.locale, () => {
          if (mine === generation) stopCurrent = null;
          settle();
        });
        if (!stopCurrent) return settle();
        timer = setTimeout(settle, speechTimeoutMs(text));
      };
      const urls = ids.map((id) => options.lineUrl?.(id));
      if (urls.some((url) => !url)) return fallback();

      void (async () => {
        for (const [i, url] of (urls as string[]).entries()) {
          let line: PlayingLine;
          try {
            line = await playLine(url);
          } catch {
            // A recording that won't play: say the rest with browser speech.
            return fallback(i);
          }
          if (mine !== generation) return line.stop();
          stopCurrent = line.stop;
          await line.ended;
          if (mine !== generation) return;
        }
        stopCurrent = null;
        settle();
      })();
    });
  }

  return {
    say(...ids) {
      if (ids.length === 0) return Promise.resolve();
      last = ids;
      return play(ids);
    },
    again() {
      if (last !== null) void play(last);
    },
    stop,
    get last() {
      return last;
    },
  };
}

function browserPlayLine(url: string): Promise<PlayingLine> {
  const audio = new Audio(url);
  const ended = new Promise<void>((resolve) => {
    audio.addEventListener("ended", () => resolve(), { once: true });
    audio.addEventListener("error", () => resolve(), { once: true });
  });
  return audio.play().then(() => ({ stop: () => audio.pause(), ended }));
}

function browserSpeak(
  text: string,
  locale: Locale,
  onEnd?: () => void,
): (() => void) | null {
  if (typeof speechSynthesis === "undefined") return null;
  try {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    if (onEnd) {
      utterance.addEventListener("end", onEnd, { once: true });
      utterance.addEventListener("error", onEnd, { once: true });
    }
    speechSynthesis.speak(utterance);
    return () => speechSynthesis.cancel();
  } catch {
    return null;
  }
}
