import type { Attempt, GameManifest } from "@repo/game-contract";
import { describe, expect, it, vi } from "vitest";
import type { PlayRecord, Student } from "../platform/ports.ts";
import { standInLinks } from "../platform/stand-ins/links.ts";
import type { Outbox } from "./outbox.ts";
import { createPlay } from "./play.ts";

const manifest = {
  slug: "sample",
  version: 3,
  renderer: "dom",
  avatar: "portrait",
  tiers: {
    g3: { grade: 3, expectations: ["math-2020.g3.B2.8"] },
    g4: { grade: 4, expectations: ["math-2020.g4.B1.4"] },
  },
  misconceptions: {
    "bigger-denominator-bigger": { expectations: ["math-2020.g4.B1.4"] },
    "counts-marks": { expectations: ["math-2020.g3.B2.8"] },
  },
  strings: { "en-CA": {} },
} satisfies GameManifest;

const inClass: Student = {
  id: "student-1",
  grade: 4,
  locale: "en-CA",
  look: { body: "sky", eyes: "sparkle", headwear: "crown" },
  classId: "class-1",
};

function fakeOutbox(drained = true) {
  const added: PlayRecord[] = [];
  const outbox: Outbox = {
    add: (record) => void added.push(record),
    flush: async () => drained,
    drain: vi.fn(async () => drained),
    pending: 0,
    dispose() {},
  };
  return { outbox, added };
}

function setUp(
  overrides: {
    student?: Student;
    portal?: string | null;
    drained?: boolean;
  } = {},
) {
  const { outbox, added } = fakeOutbox(overrides.drained);
  const onInvalid = vi.fn();
  let n = 0;
  const play = createPlay({
    id: "play-1",
    manifest,
    tier: "g4",
    student: overrides.student ?? inClass,
    portal: overrides.portal === undefined ? "north" : overrides.portal,
    outbox,
    links: standInLinks({ base: "/play/" }),
    newId: () => `id-${++n}`,
    now: () => new Date("2026-10-23T14:00:00.000Z"),
    onInvalid,
  });
  return { play, outbox, added, onInvalid };
}

const attempt = (a: Partial<Attempt<GameManifest>> = {}) =>
  ({
    task: "order-1",
    expectation: "math-2020.g4.B1.4",
    succeeded: false,
    ...a,
  }) as Attempt<GameManifest>;

describe("recording attempts", () => {
  it("adds the student, play, game, version, tier and time to each attempt", () => {
    const { play, added } = setUp();
    play.record(
      attempt({ misconception: "bigger-denominator-bigger", assisted: "hint" }),
    );
    expect(added).toEqual([
      {
        kind: "attempt",
        id: "id-1",
        play: "play-1",
        student: "student-1",
        game: "sample",
        gameVersion: 3,
        tier: "g4",
        at: "2026-10-23T14:00:00.000Z",
        task: "order-1",
        expectation: "math-2020.g4.B1.4",
        succeeded: false,
        misconception: "bigger-denominator-bigger",
        assisted: "hint",
      },
    ]);
  });

  it("gives every attempt its own ID, so retries of a task stay distinct", () => {
    const { play, added } = setUp();
    play.record(attempt());
    play.record(attempt({ succeeded: true }));
    expect(added.map((r) => [r.id, r.kind === "attempt" && r.task])).toEqual([
      ["id-1", "order-1"],
      ["id-2", "order-1"],
    ]);
  });

  it.each([
    ["an expectation from another tier", { expectation: "math-2020.g3.B2.8" }],
    ["an unknown misconception", { misconception: "made-up" }],
    [
      "a misconception from another expectation",
      { misconception: "counts-marks" },
    ],
    ["no task", { task: "" }],
    ["an unknown kind of help", { assisted: "telepathy" }],
  ])("drops an attempt with %s", (_, bad) => {
    const { play, added, onInvalid } = setUp();
    play.record(attempt(bad as Partial<Attempt<GameManifest>>));
    expect(added).toEqual([]);
    expect(onInvalid).toHaveBeenCalledOnce();
  });
});

describe("ending", () => {
  it("returns a student in a class to the portal they came through", async () => {
    const { play } = setUp();
    const exit = await play.end("finished");
    expect(exit.kind).toBe("hub");
    const url = new URL(
      exit.kind === "hub" ? exit.url : "",
      "http://localhost",
    );
    expect(url.searchParams.get("portal")).toBe("north");
    expect(url.searchParams.get("play")).toBe("play-1");
  });

  it("returns a student who leaves to their portal too", async () => {
    const { play } = setUp();
    expect((await play.end("left")).kind).toBe("hub");
  });

  it.each(["finished", "left"] as const)(
    "shows the end screen for a game link opened directly (%s)",
    async (ending) => {
      const { play } = setUp({ portal: null });
      expect(await play.end(ending)).toEqual({ kind: "end-screen", ending });
    },
  );

  it("shows the end screen for a student who isn't in a class", async () => {
    const { play } = setUp({ student: { ...inClass, classId: null } });
    expect(await play.end("finished")).toEqual({
      kind: "end-screen",
      ending: "finished",
    });
  });

  it.each(["finished", "left", "crashed"] as const)(
    "records how the play ended (%s) after its attempts, then sends them",
    async (ending) => {
      const { play, added, outbox } = setUp();
      play.record(attempt());
      await play.end(ending);
      expect(added.map((r) => r.kind)).toEqual(["attempt", "end"]);
      expect(added[1]).toEqual({
        kind: "end",
        id: "id-2",
        play: "play-1",
        student: "student-1",
        game: "sample",
        gameVersion: 3,
        tier: "g4",
        at: "2026-10-23T14:00:00.000Z",
        ending,
      });
      expect(outbox.drain).toHaveBeenCalledOnce();
    },
  );

  it("drops attempts the game makes after the play ended", async () => {
    const { play, added, onInvalid } = setUp();
    await play.end("finished");
    play.record(attempt());
    expect(added.map((r) => r.kind)).toEqual(["end"]);
    expect(onInvalid).toHaveBeenCalledOnce();
  });

  it("sends what's pending first, but leaves even if that times out", async () => {
    const { play, outbox } = setUp({ drained: false });
    expect((await play.end("finished", 1234)).kind).toBe("hub");
    expect(outbox.drain).toHaveBeenCalledWith(1234);
  });

  it("ends once: the first ending wins", async () => {
    const { play, outbox, added } = setUp({ portal: null });
    const [first] = await Promise.all([play.end("left"), play.end("finished")]);
    expect(first).toEqual({ kind: "end-screen", ending: "left" });
    expect(await play.end("finished")).toEqual(first);
    expect(outbox.drain).toHaveBeenCalledOnce();
    expect(added.filter((r) => r.kind === "end")).toEqual([
      expect.objectContaining({ ending: "left" }),
    ]);
  });
});
