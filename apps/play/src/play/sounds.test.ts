import { afterEach, describe, expect, it, vi } from "vitest";
import { stubAudio } from "../test/fake-audio.ts";
import { createSounds } from "./sounds.ts";

const files = { ding: "ding.ogg", song: "song.ogg", other: "other.ogg" };

async function started() {
  const audio = stubAudio();
  const sounds = createSounds(files);
  sounds.start();
  await audio.loaded();
  const context = audio.contexts[0];
  if (!context) throw new Error("no audio context");
  return { audio, sounds, context };
}

afterEach(() => vi.unstubAllGlobals());

describe("createSounds", () => {
  it("doesn't touch audio until the tap, so the browser allows it", () => {
    const audio = stubAudio();
    createSounds(files);
    expect(audio.contexts).toEqual([]);
    expect(audio.fetched).toEqual([]);
  });

  it("makes no audio for a game with no sounds", () => {
    const audio = stubAudio();
    createSounds().start();
    expect(audio.contexts).toEqual([]);
  });

  it("plays an overlapping effect for each call, at its rate", async () => {
    const { sounds, context } = await started();
    sounds.play("ding");
    sounds.play("ding", { rate: 1.1 });
    expect(context.sources.map((s) => [s.buffer, s.started])).toEqual([
      ["ding.ogg", true],
      ["ding.ogg", true],
    ]);
    expect(context.sources[1]?.playbackRate.value).toBe(1.1);
  });

  it("drops an effect that isn't loaded, rather than playing it late", () => {
    stubAudio();
    const sounds = createSounds(files);
    sounds.start();
    expect(() => sounds.play("ding")).not.toThrow();
  });

  it("stays silent when a file won't decode, and warns", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const audio = stubAudio({ failing: ["ding.ogg"] });
    const sounds = createSounds(files);
    sounds.start();
    await audio.loaded();
    sounds.play("ding");
    expect(audio.contexts[0]?.sources).toEqual([]);
    expect(warn).toHaveBeenCalled();
  });

  it("does nothing on a device without Web Audio", () => {
    vi.stubGlobal("AudioContext", undefined);
    const sounds = createSounds(files);
    sounds.start();
    sounds.play("ding");
    sounds.music("song");
    expect(sounds.duck()).toBeInstanceOf(Function);
  });

  it("loops music, and starts a track that's still loading when it's ready", async () => {
    const audio = stubAudio();
    const sounds = createSounds(files);
    sounds.start();
    sounds.music("song");
    expect(audio.contexts[0]?.sources).toEqual([]);
    await audio.loaded();
    const [source] = audio.contexts[0]?.sources ?? [];
    expect(source).toMatchObject({
      buffer: "song.ogg",
      loop: true,
      started: true,
    });
  });

  it("fades from one track to the next, and doesn't restart the same one", async () => {
    const { sounds, context } = await started();
    sounds.music("song");
    sounds.music("song");
    expect(context.sources).toHaveLength(1);
    sounds.music("other");
    expect(context.sources).toHaveLength(2);
    expect(context.sources[0]?.stoppedAt).toBeDefined();
    expect(context.sources[0]?.gain?.gain.target).toBe(0);
    expect(context.sources[1]?.buffer).toBe("other.ogg");
    sounds.music(null);
    expect(context.sources[1]?.stoppedAt).toBeDefined();
  });

  it("doesn't start a track that's no longer wanted once it loads", async () => {
    const audio = stubAudio();
    const sounds = createSounds(files);
    sounds.start();
    sounds.music("song");
    sounds.music(null);
    await audio.loaded();
    expect(audio.contexts[0]?.sources).toEqual([]);
  });

  it("keeps the music down until every duck has been released", async () => {
    const { sounds, context } = await started();
    // The effects' bus, then the music's.
    const music = context.gains[1];
    const level = () => music?.gain.target;
    const first = sounds.duck();
    const ducked = level();
    const second = sounds.duck();
    first();
    first();
    expect(level()).toBe(ducked);
    second();
    expect(level()).toBeGreaterThan(ducked as number);
  });

  it("holds everything, dropping effects, until released", async () => {
    const { sounds, context } = await started();
    sounds.hold();
    expect(context.state).toBe("suspended");
    sounds.play("ding");
    expect(context.sources).toEqual([]);
    sounds.release();
    expect(context.state).toBe("running");
    sounds.play("ding");
    expect(context.sources).toHaveLength(1);
  });

  it("goes silent for good on close", async () => {
    const { sounds, context } = await started();
    sounds.close();
    expect(context.state).toBe("closed");
    sounds.play("ding");
    expect(context.sources).toEqual([]);
  });
});
