import { describe, expect, it, vi } from "vitest";
import { createVoice, speechTimeoutMs, type VoiceOptions } from "./voice.ts";

const text = (id: string) => `text of ${id}`;

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
