import { describe, expect, it, vi } from "vitest";
import { createVoice } from "./voice.ts";
import { resolveLineUrl } from "./voice-lines.ts";

// What `@repo/voice/vite` builds for a game: current lines only. Here "stale"
// (text changed), "missing" (no file) and "orphan" (no such string) are all
// simply absent from the map.
const game = {
  manifest: { slug: "demo" },
  lines: { "en-CA": { intro: "/play/assets/intro-abc123.mp3" } },
} as const;

describe("resolveLineUrl", () => {
  it("resolves a line in the map", () => {
    expect(resolveLineUrl(game, "en-CA", "intro")).toBe(
      "/play/assets/intro-abc123.mp3",
    );
  });

  it("doesn't resolve stale, missing or orphaned lines", () => {
    for (const id of ["stale", "missing", "orphan"]) {
      expect(resolveLineUrl(game, "en-CA", id)).toBeUndefined();
    }
  });

  it("doesn't resolve for a locale or a game without recordings", () => {
    expect(resolveLineUrl(game, "fr-CA", "intro")).toBeUndefined();
    expect(resolveLineUrl({ manifest: { slug: "x" } }, "en-CA", "intro")).toBe(
      undefined,
    );
  });
});

describe("say with the resolver", () => {
  const setUp = () => {
    const spoken: string[] = [];
    const playLine = vi.fn(async () => ({
      stop: () => {},
      ended: Promise.resolve(),
    }));
    const voice = createVoice({
      text: (id) => `text of ${id}`,
      locale: "en-CA",
      lineUrl: (id) => resolveLineUrl(game, "en-CA", id),
      playLine,
      speak: (text) => {
        spoken.push(text);
        return () => {};
      },
    });
    return { voice, spoken, playLine };
  };

  it("plays a current line's recording", async () => {
    const { voice, spoken, playLine } = setUp();
    voice.say("intro");
    await vi.waitFor(() =>
      expect(playLine).toHaveBeenCalledWith("/play/assets/intro-abc123.mp3"),
    );
    expect(spoken).toEqual([]);
  });

  it("falls back to browser speech for stale, missing and orphaned lines", () => {
    const { voice, spoken, playLine } = setUp();
    voice.say("stale");
    voice.say("missing");
    voice.say("orphan");
    expect(spoken).toEqual([
      "text of stale",
      "text of missing",
      "text of orphan",
    ]);
    expect(playLine).not.toHaveBeenCalled();
  });

  it("speaks a whole instruction with browser speech if any line lacks a recording", () => {
    const { voice, spoken, playLine } = setUp();
    voice.say("intro", "stale");
    expect(spoken).toEqual(["text of intro text of stale"]);
    expect(playLine).not.toHaveBeenCalled();
  });
});
