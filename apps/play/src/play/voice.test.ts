import { afterEach, describe, expect, it, vi } from "vitest";
import {
  browserSpeak,
  createVoice,
  createVoiceGate,
  type Synth,
  speechTimeoutMs,
  type VoiceOptions,
  voiceFor,
} from "./voice.ts";

const text = (id: string) => `text of ${id}`;

describe("lowering the music", () => {
  it("holds it down from the start of an instruction until it settles", async () => {
    const release = vi.fn();
    const duck = vi.fn(() => release);
    const voice = createVoice({
      text,
      locale: "en-CA",
      speak: (_, __, onEnd) => {
        setTimeout(() => onEnd?.(), 0);
        return () => {};
      },
      duck,
    });
    const said = voice.say("a");
    expect(duck).toHaveBeenCalledTimes(1);
    expect(release).not.toHaveBeenCalled();
    await said;
    await Promise.resolve();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("doesn't let the music up between one instruction and the next", async () => {
    const events: string[] = [];
    const voice = createVoice({
      text,
      locale: "en-CA",
      speak: () => () => {},
      duck: () => {
        events.push("down");
        return () => events.push("up");
      },
    });
    void voice.say("a");
    void voice.say("b");
    await Promise.resolve();
    await Promise.resolve();
    expect(events).toEqual(["down", "down", "up"]);
  });

  it("holds it down for hear-it-again too", () => {
    const duck = vi.fn(() => () => {});
    const voice = createVoice({
      text,
      locale: "en-CA",
      speak: () => () => {},
      duck,
    });
    void voice.say("a");
    voice.again();
    expect(duck).toHaveBeenCalledTimes(2);
  });
});

describe("the gate's listeners", () => {
  it("hear it close and open, until they stop listening", () => {
    const gate = createVoiceGate();
    const heard: boolean[] = [];
    const stop = gate.listen((closed) => heard.push(closed));
    gate.close();
    gate.open();
    stop();
    gate.close();
    expect(heard).toEqual([true, false]);
  });
});

function setUp(overrides: Partial<VoiceOptions> = {}) {
  const spoken: string[] = [];
  const stopSpeech = vi.fn();
  const voice = createVoice({
    text,
    locale: "en-CA",
    speak: (t) => {
      spoken.push(t);
      return stopSpeech;
    },
    ...overrides,
  });
  return { voice, spoken, stopSpeech };
}

describe("voice", () => {
  it("speaks a line with browser speech when it has no recording", () => {
    const { voice, spoken } = setUp();
    voice.say("intro");
    expect(spoken).toEqual(["text of intro"]);
  });

  it("plays a line's recording when it has one", async () => {
    const playLine = vi.fn(async () => ({
      stop: () => {},
      ended: Promise.resolve(),
    }));
    const { voice, spoken } = setUp({
      lineUrl: (id) => `/voice/${id}.mp3`,
      playLine,
    });
    voice.say("intro");
    await vi.waitFor(() =>
      expect(playLine).toHaveBeenCalledWith("/voice/intro.mp3"),
    );
    expect(spoken).toEqual([]);
  });

  it("falls back to browser speech when the recording won't play", async () => {
    const { voice, spoken } = setUp({
      lineUrl: () => "/missing.mp3",
      playLine: () => Promise.reject(new Error("404")),
    });
    voice.say("intro");
    await vi.waitFor(() => expect(spoken).toEqual(["text of intro"]));
  });

  it("hears the last line again", () => {
    const { voice, spoken } = setUp();
    voice.say("intro");
    voice.say("step-2");
    voice.again();
    expect(spoken).toEqual([
      "text of intro",
      "text of step-2",
      "text of step-2",
    ]);
    expect(voice.last).toEqual(["step-2"]);
  });

  it("says several lines as one sentence with browser speech, and hears them all again", () => {
    const { voice, spoken } = setUp();
    voice.say("order", "amount", "unit");
    voice.again();
    expect(spoken).toEqual([
      "text of order text of amount text of unit",
      "text of order text of amount text of unit",
    ]);
  });

  it("plays several recordings one after another", async () => {
    const finish: Record<string, () => void> = {};
    const playLine = vi.fn(async (url: string) => ({
      stop: () => {},
      ended: new Promise<void>((resolve) => {
        finish[url] = resolve;
      }),
    }));
    const { voice } = setUp({ lineUrl: (id) => id, playLine });
    voice.say("a", "b");
    await vi.waitFor(() => expect(playLine).toHaveBeenCalledWith("a"));
    expect(playLine).not.toHaveBeenCalledWith("b");
    finish.a?.();
    await vi.waitFor(() => expect(playLine).toHaveBeenCalledWith("b"));
  });

  it("says the rest with browser speech when a recording won't play", async () => {
    const { voice, spoken } = setUp({
      lineUrl: (id) => id,
      playLine: async (url) => {
        if (url === "b") throw new Error("404");
        return { stop: () => {}, ended: Promise.resolve() };
      },
    });
    voice.say("a", "b", "c");
    await vi.waitFor(() => expect(spoken).toEqual(["text of b text of c"]));
  });

  it("stops the rest of an instruction when a new one starts", async () => {
    const stops: string[] = [];
    let finishA = () => {};
    const playLine = vi.fn(async (url: string) => ({
      stop: () => stops.push(url),
      ended: new Promise<void>((resolve) => {
        if (url === "a") finishA = resolve;
      }),
    }));
    const { voice } = setUp({ lineUrl: (id) => id, playLine });
    voice.say("a", "b");
    await vi.waitFor(() => expect(playLine).toHaveBeenCalledWith("a"));
    voice.say("c");
    finishA();
    await vi.waitFor(() => expect(playLine).toHaveBeenCalledWith("c"));
    await new Promise((r) => setTimeout(r, 10));
    expect(stops).toContain("a");
    expect(playLine).not.toHaveBeenCalledWith("b");
  });

  it("has nothing to hear again before any line", () => {
    const { voice, spoken } = setUp();
    voice.again();
    expect(spoken).toEqual([]);
  });

  it("stops the current line when a new one starts", () => {
    const { voice, stopSpeech } = setUp();
    voice.say("intro");
    voice.say("step-2");
    expect(stopSpeech).toHaveBeenCalledOnce();
  });

  it("stays silent, without failing, when the device has no speech", () => {
    const voice = createVoice({ text, locale: "en-CA", speak: () => null });
    expect(() => voice.say("intro")).not.toThrow();
  });

  describe("an instruction settles", () => {
    const settled = (promise: Promise<void>) => {
      let done = false;
      void promise.then(() => {
        done = true;
      });
      return async () => {
        await new Promise((r) => setTimeout(r, 0));
        return done;
      };
    };

    it("when its last recording ends", async () => {
      const finish: Record<string, () => void> = {};
      const { voice } = setUp({
        lineUrl: (id) => id,
        playLine: async (url) => ({
          stop: () => {},
          ended: new Promise<void>((resolve) => {
            finish[url] = resolve;
          }),
        }),
      });
      const isDone = settled(voice.say("a", "b"));
      await vi.waitFor(() => expect(finish.a).toBeDefined());
      finish.a?.();
      await vi.waitFor(() => expect(finish.b).toBeDefined());
      expect(await isDone()).toBe(false);
      finish.b?.();
      await vi.waitFor(async () => expect(await isDone()).toBe(true));
    });

    it("when browser speech ends", async () => {
      let end = () => {};
      const { voice } = setUp({
        speak: (_text, _locale, onEnd) => {
          end = onEnd ?? end;
          return () => {};
        },
      });
      const isDone = settled(voice.say("intro"));
      expect(await isDone()).toBe(false);
      end();
      expect(await isDone()).toBe(true);
    });

    it("when it's cut off by another instruction, or stopped", async () => {
      const { voice } = setUp();
      const first = settled(voice.say("intro"));
      const second = settled(voice.say("step-2"));
      expect(await first()).toBe(true);
      expect(await second()).toBe(false);
      voice.stop();
      expect(await second()).toBe(true);
    });

    it("at once on a device with no speech", async () => {
      const voice = createVoice({ text, locale: "en-CA", speak: () => null });
      await expect(voice.say("intro")).resolves.toBeUndefined();
    });

    it("even if browser speech never says it ended", async () => {
      vi.useFakeTimers();
      const { voice } = setUp();
      let done = false;
      void voice.say("intro").then(() => {
        done = true;
      });
      await vi.advanceTimersByTimeAsync(speechTimeoutMs("text of intro") - 1);
      expect(done).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(done).toBe(true);
      vi.useRealTimers();
    });
  });
});

describe("browser speech", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  class Utterance extends EventTarget {
    lang = "";
    voice: SpeechSynthesisVoice | null = null;
    constructor(readonly text: string) {
      super();
    }
  }

  function fakeSynth(voices: Partial<SpeechSynthesisVoice>[] = []) {
    const calls: string[] = [];
    const said: Utterance[] = [];
    const synth: Synth = {
      speaking: false,
      pending: false,
      speak: (u) => {
        calls.push("speak");
        said.push(u as unknown as Utterance);
      },
      cancel: () => calls.push("cancel"),
      resume: () => calls.push("resume"),
      getVoices: () => voices as SpeechSynthesisVoice[],
    };
    return { synth, calls, said };
  }

  const voice = (lang: string, isDefault = false) =>
    ({ lang, name: lang, default: isDefault }) as SpeechSynthesisVoice;

  it("speaks after the task that stopped the last line, which Chrome would drop", () => {
    vi.useFakeTimers();
    vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
    const { synth, calls, said } = fakeSynth();
    browserSpeak("Pick a game to play.", "en-CA", undefined, synth);
    expect(calls).toEqual([]);
    vi.runAllTimers();
    expect(calls).toEqual(["resume", "speak"]);
    expect(said[0]?.text).toBe("Pick a game to play.");
  });

  it("never starts a line stopped before it began", () => {
    vi.useFakeTimers();
    vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
    const { synth, calls } = fakeSynth();
    browserSpeak("Grade 4", "en-CA", undefined, synth)?.();
    vi.runAllTimers();
    expect(calls).toEqual(["cancel"]);
  });

  it("ends when the utterance ends or fails", () => {
    vi.useFakeTimers();
    vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
    const { synth, said } = fakeSynth();
    const onEnd = vi.fn();
    browserSpeak("Yes", "en-CA", onEnd, synth);
    vi.runAllTimers();
    said[0]?.dispatchEvent(new Event("error"));
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it("is unavailable without speech synthesis", () => {
    expect(browserSpeak("Yes", "en-CA", undefined, undefined)).toBeNull();
  });

  it("picks the locale's voice, else the language's default, else any of the language", () => {
    expect(voiceFor([voice("en-US"), voice("en-CA")], "en-CA")?.lang).toBe(
      "en-CA",
    );
    expect(
      voiceFor([voice("en-GB"), voice("en-US", true)], "en-CA")?.lang,
    ).toBe("en-US");
    expect(voiceFor([voice("fr-CA"), voice("en_GB")], "en-CA")?.lang).toBe(
      "en_GB",
    );
    expect(voiceFor([voice("fr-CA")], "en-CA")).toBeUndefined();
  });
});

describe("voice gate", () => {
  it("stops what every voice behind it is saying when it closes", () => {
    const gate = createVoiceGate();
    const a = setUp({ gate });
    const b = setUp({ gate });
    a.voice.say("intro");
    b.voice.say("hint");
    gate.close();
    expect(a.stopSpeech).toHaveBeenCalled();
    expect(b.stopSpeech).toHaveBeenCalled();
  });

  it("drops lines said while closed, and doesn't say them when it opens", () => {
    const gate = createVoiceGate();
    const { voice, spoken } = setUp({ gate });
    gate.close();
    voice.say("intro");
    voice.again();
    gate.open();
    expect(spoken).toEqual([]);
  });

  it("holds a dropped line's instruction until it opens, so what awaits it waits", async () => {
    const gate = createVoiceGate();
    const { voice } = setUp({ gate });
    gate.close();
    const settled = vi.fn();
    void voice.say("intro").then(settled);
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    gate.open();
    await vi.waitFor(() => expect(settled).toHaveBeenCalled());
  });

  it("settles a held instruction when its voice stops", async () => {
    const gate = createVoiceGate();
    const { voice } = setUp({ gate });
    gate.close();
    const said = voice.say("intro");
    voice.stop();
    await said;
  });

  it("doesn't touch a voice without it", () => {
    const gate = createVoiceGate();
    const { voice, spoken } = setUp();
    gate.close();
    voice.say("intro");
    expect(spoken).toEqual(["text of intro"]);
  });

  it("speaks again once open", () => {
    const gate = createVoiceGate();
    const { voice, spoken } = setUp({ gate });
    gate.close();
    gate.open();
    voice.say("intro");
    expect(spoken).toEqual(["text of intro"]);
  });
});
