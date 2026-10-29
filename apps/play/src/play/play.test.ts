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
    "bigger-denominator-bigger": {
      description: "Thinks a bigger bottom number is a bigger piece.",
      expectations: ["math-2020.g4.B1.4"],
    },
    "counts-marks": {
      description: "Counts the marks, not the spaces.",
      expectations: ["math-2020.g3.B2.8"],
    },
  },
  strings: { "en-CA": { title: "Test Game" } },
} satisfies GameManifest;

const student: Student = {
  id: "student-1",
  locale: "en-CA",
  look: {
    body: "skin-07",
    hair: "hair-12",
    hat: "hat-07",
    top: "top-08",
    bottom: "bottom-11",
    shoes: "shoes-05",
  },
  classes: [],
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

function setUp(overrides: { drained?: boolean } = {}) {
  const { outbox, added } = fakeOutbox(overrides.drained);
  const onInvalid = vi.fn();
  let n = 0;
  const play = createPlay({
    id: "play-1",
    manifest,
    tier: "g4",
    student,
    classId: "class-1",
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
  it("adds the student, class, play, game, version, tier and time to each attempt", () => {
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
        class: "class-1",
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
    ["an empty ask", { asked: "" }],
    ["a detail over 200 characters", { detail: "x".repeat(201) }],
    ["an exploring try that succeeded", { exploring: true, succeeded: true }],
    [
      "an exploring try that revealed a misconception",
      { exploring: true, misconception: "bigger-denominator-bigger" },
    ],
    ["an exploring try with help", { exploring: true, assisted: "hint" }],
  ])("drops an attempt with %s", (_, bad) => {
    const { play, added, onInvalid } = setUp();
    play.record(attempt(bad as Partial<Attempt<GameManifest>>));
    expect(added).toEqual([]);
    expect(onInvalid).toHaveBeenCalledOnce();
  });

  it("passes on what the task asked, what the try did, and that it explored", () => {
    const { play, added } = setUp();
    play.record(
      attempt({
        asked: "Reach 5/4.",
        detail: "Hopped 1/8: stopped at 1/8.",
        exploring: true,
      }),
    );
    play.record(attempt({ succeeded: true, exploring: false }));
    expect(added).toEqual([
      expect.objectContaining({
        asked: "Reach 5/4.",
        detail: "Hopped 1/8: stopped at 1/8.",
        exploring: true,
      }),
      expect.not.objectContaining({ exploring: expect.anything() }),
    ]);
    expect(added[1]).not.toHaveProperty("asked");
  });

  it("drops an attempt whose task asks something new within the play", () => {
    const { play, added, onInvalid } = setUp();
    play.record(attempt({ asked: "Reach 5/4." }));
    play.record(attempt());
    play.record(attempt({ asked: "Reach 5/4." }));
    play.record(attempt({ asked: "Reach 3/4." }));
    play.record(attempt({ task: "order-2", asked: "Reach 3/4." }));
    expect(added).toHaveLength(4);
    expect(onInvalid).toHaveBeenCalledOnce();
    expect(onInvalid.mock.calls[0]?.[0]).toMatch(/asked "Reach 5\/4\."/);
  });
});

describe("ending", () => {
  it.each(["finished", "left", "crashed"] as const)(
    "returns the student to their locker, naming the play (%s)",
    async (ending) => {
      const { play } = setUp();
      const url = new URL(await play.end(ending), "http://localhost");
      expect(url.pathname).toBe("/play/");
      expect(url.searchParams.get("play")).toBe("play-1");
    },
  );

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
        class: "class-1",
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
    expect(await play.end("finished", 1234)).toBe("/play/?play=play-1");
    expect(outbox.drain).toHaveBeenCalledWith(1234);
  });

  it("ends once: the first ending wins", async () => {
    const { play, outbox, added } = setUp();
    const [first] = await Promise.all([play.end("left"), play.end("finished")]);
    expect(await play.end("finished")).toBe(first);
    expect(outbox.drain).toHaveBeenCalledOnce();
    expect(added.filter((r) => r.kind === "end")).toEqual([
      expect.objectContaining({ ending: "left" }),
    ]);
  });
});
