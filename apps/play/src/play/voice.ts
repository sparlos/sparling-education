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
  /** Whether an instruction is being said now. */
  readonly speaking: boolean;
  /** Hears `speaking` change. Returns its unlistening. */
  listen(onChange: () => void): () => void;
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
  /** The gate that can silence this voice; see `createVoiceGate`. */
  gate?: VoiceGate;
  /**
   * Called as an instruction starts, to lower the music under it. The
   * function it returns is called when the instruction settles.
   */
  duck?(): () => void;
}

/**
 * Silences every voice that shares it, for a line that must be heard over
 * everything else (the too-small screen's). While it's closed, a voice drops
 * what it's asked to say rather than queueing it, and the instruction settles
 * only when the gate opens, so a game awaiting it waits instead of racing
 * ahead in silence.
 */
export interface VoiceGate {
  readonly closed: boolean;
  /** Stops whatever is being said, and keeps every voice silent until `open`. */
  close(): void;
  open(): void;
  /** For voices: an instruction has started; closing stops it. Returns its untracking. */
  track(stop: () => void): () => void;
  /** For voices: settles once the gate is open. */
  opened(): Promise<void>;
  /** Hears the gate close and open, for other sound. Returns its unlistening. */
  listen(onChange: (closed: boolean) => void): () => void;
}

export function createVoiceGate(): VoiceGate {
  let closed = false;
  const playing = new Set<() => void>();
  let waiting: (() => void)[] = [];
  const listeners = new Set<(closed: boolean) => void>();
  return {
    get closed() {
      return closed;
    },
    close() {
      closed = true;
      for (const stop of [...playing]) stop();
      for (const listener of listeners) listener(true);
    },
    open() {
      closed = false;
      for (const resolve of waiting) resolve();
      waiting = [];
      for (const listener of listeners) listener(false);
    },
    listen(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    track(stop) {
      playing.add(stop);
      return () => playing.delete(stop);
    },
    opened() {
      if (!closed) return Promise.resolve();
      return new Promise((resolve) => waiting.push(resolve));
    },
  };
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
  let speaking = false;
  let instruction = 0;
  const listeners = new Set<() => void>();

  function setSpeaking(next: boolean) {
    if (next === speaking) return;
    speaking = next;
    for (const listener of listeners) listener();
  }

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
    const gate = options.gate;
    if (gate?.closed)
      return new Promise<void>((resolve) => {
        settleCurrent = resolve;
        void gate.opened().then(resolve);
      });
    // Its own function, so a late settle of this one can't untrack the next.
    const untrack = gate?.track(() => stop());
    return new Promise<void>((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const settle = () => {
        clearTimeout(timer);
        untrack?.();
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

  function instruct(ids: readonly string[]): Promise<void> {
    const undo = options.duck?.();
    const said = play(ids);
    if (undo) void said.then(undo);
    // An instruction cut off by the next one mustn't end the next one's turn.
    instruction += 1;
    const mine = instruction;
    setSpeaking(true);
    void said.then(() => {
      if (mine === instruction) setSpeaking(false);
    });
    return said;
  }

  return {
    say(...ids) {
      if (ids.length === 0) return Promise.resolve();
      last = ids;
      return instruct(ids);
    },
    again() {
      if (last !== null) void instruct(last);
    },
    stop,
    get last() {
      return last;
    },
    get speaking() {
      return speaking;
    },
    listen(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
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

/** What browser speech needs of `speechSynthesis`; a fake in tests. */
export type Synth = Pick<
  SpeechSynthesis,
  "speak" | "cancel" | "resume" | "getVoices" | "speaking" | "pending"
>;

// The utterance being spoken. Chrome forgets an utterance nothing refers to,
// and with it the `end` event.
let speaking: SpeechSynthesisUtterance | null = null;

export function browserSpeak(
  text: string,
  locale: Locale,
  onEnd?: () => void,
  synth: Synth | undefined = globalThis.speechSynthesis,
): (() => void) | null {
  if (!synth || typeof SpeechSynthesisUtterance === "undefined") return null;
  try {
    if (synth.speaking || synth.pending) synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    // Few devices have an en-CA voice, and Chrome can stay silent for a
    // language it has no voice for, so pick one of the same language.
    const voice = voiceFor(synth.getVoices(), locale);
    if (voice) utterance.voice = voice;
    if (onEnd) {
      utterance.addEventListener("end", onEnd, { once: true });
      utterance.addEventListener("error", onEnd, { once: true });
    }
    speaking = utterance;
    // Chrome drops an utterance spoken in the same task as `cancel()`, and
    // stopping one line to say the next does exactly that. `resume()` wakes
    // speech that Chrome left paused.
    let stopped = false;
    const start = setTimeout(() => {
      if (stopped) return;
      synth.resume();
      synth.speak(utterance);
    }, 0);
    return () => {
      stopped = true;
      clearTimeout(start);
      if (speaking === utterance) speaking = null;
      synth.cancel();
    };
  } catch {
    return null;
  }
}

/** The voice for this exact locale, else one of the same language. */
export function voiceFor(
  voices: readonly SpeechSynthesisVoice[],
  locale: Locale,
): SpeechSynthesisVoice | undefined {
  const lang = (v: SpeechSynthesisVoice) => v.lang.replace("_", "-");
  const language = locale.split("-")[0];
  return (
    voices.find((v) => lang(v) === locale) ??
    voices.find((v) => lang(v).split("-")[0] === language && v.default) ??
    voices.find((v) => lang(v).split("-")[0] === language)
  );
}
