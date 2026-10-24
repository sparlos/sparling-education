// Plays a string's voice line: the build-time recording when there is one,
// browser speech otherwise, and nothing if neither works (no grade requires
// sound, so a silent device still plays).
import type { Locale } from "@repo/game-contract";

export interface Voice {
  /**
   * Says one or more lines in a row, as one instruction: "This gap needs" +
   * "three fourths" + "of a plank."
   */
  say(...ids: string[]): void;
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
   * The URL of a string's build-time recording, if it has one. Recordings
   * come with the starter kit's voice-line generation (build-order step 6);
   * until then every line uses browser speech.
   */
  lineUrl?(id: string): string | undefined;
  /** Starts a recording; rejects if it can't play. */
  playLine?(url: string): Promise<PlayingLine>;
  /** Speaks text with browser speech. Returns a function that stops it, or null if speech is unavailable. */
  speak?(text: string, locale: Locale): (() => void) | null;
}

export function createVoice(options: VoiceOptions): Voice {
  const playLine = options.playLine ?? browserPlayLine;
  const speak = options.speak ?? browserSpeak;
  let last: readonly string[] | null = null;
  let stopCurrent: (() => void) | null = null;
  let generation = 0;

  function stop() {
    generation += 1;
    stopCurrent?.();
    stopCurrent = null;
  }

  function play(ids: readonly string[]) {
    stop();
    const mine = generation;
    // Browser speech says the whole instruction as one sentence, which
    // sounds better than separate utterances.
    const fallback = (from = 0) => {
      if (mine !== generation) return;
      const text = ids.slice(from).map(options.text).join(" ");
      stopCurrent = speak(text, options.locale);
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
    })();
  }

  return {
    say(...ids) {
      if (ids.length === 0) return;
      last = ids;
      play(ids);
    },
    again() {
      if (last !== null) play(last);
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

function browserSpeak(text: string, locale: Locale): (() => void) | null {
  if (typeof speechSynthesis === "undefined") return null;
  try {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    speechSynthesis.speak(utterance);
    return () => speechSynthesis.cancel();
  } catch {
    return null;
  }
}
