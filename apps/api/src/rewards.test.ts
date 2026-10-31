import { catalogue, rewardKind } from "@repo/rewards";
import { describe, expect, it } from "vitest";
import { client } from "../test/client.ts";
import {
  createClass,
  joinedStudent,
  playOf,
  right,
  sendRecords,
  teacher,
} from "../test/plays.ts";
import { rewardRule } from "./scoring.ts";

type Headers = { cookie: string };
type Who = { studentId: string; classId: string };

async function homeOf(headers: Headers) {
  const res = await client.home.$get(undefined, { headers });
  const home = await res.json();
  if ("error" in home) throw new Error(home.error);
  return home;
}

function markSeen(headers: Headers | undefined, rewards: string[]) {
  return client.home.seen.$post({ json: { rewards } }, { headers });
}

function markSeenInWardrobe(headers: Headers | undefined, rewards: string[]) {
  return client.home["wardrobe-seen"].$post(
    { json: { rewards } },
    { headers },
  );
}

/** A student in a new class: their headers, and who and where they play. */
async function student() {
  const room = await createClass(await teacher());
  const { headers, studentId } = await joinedStudent(room);
  return { headers, who: { studentId, classId: room.id } };
}

/** Tasks each got wrong first, then right: an improvement after a mistake each. */
const improved = (n: number) =>
  Array.from({ length: n }, () => [{ succeeded: false }, { succeeded: true }]);

/** Effort that earns exactly `n` rewards in one play, its finish included. */
const earning = (n: number) => improved(n * rewardRule.effortPerReward - 1);

async function play(
  headers: Headers,
  who: Who,
  tasks: Parameters<typeof playOf>[1],
  options: Parameters<typeof playOf>[2] = {},
) {
  const records = playOf(who, tasks, options);
  for (let i = 0; i < records.length; i += 25) {
    const res = await sendRecords(headers, records.slice(i, i + 25));
    expect(res.status).toBe(200);
  }
  return records;
}

const tuesday = new Date("2026-10-20T14:00:00Z");
const nextTuesday = new Date("2026-10-27T14:00:00Z");

describe("rewards", () => {
  it("grants rewards from a play's effort when it ends, from the start of the catalogue", async () => {
    const { headers, who } = await student();
    await play(headers, who, earning(2));
    const home = await homeOf(headers);
    const granted = catalogue.slice(0, 2);
    expect(home.unseen).toEqual(granted);
    for (const id of granted)
      if (rewardKind(id) === "sticker") expect(home.stickers).toContain(id);
      else expect(home.owned).toContain(id);
  });

  it("gives a new student nothing new and no stickers", async () => {
    const { headers } = await student();
    const home = await homeOf(headers);
    expect(home.stickers).toEqual([]);
    expect(home.unseen).toEqual([]);
  });

  it("grants nothing until the play ends", async () => {
    const { headers, who } = await student();
    const records = await play(headers, who, earning(1), { ending: null });
    expect((await homeOf(headers)).unseen).toEqual([]);
    const play2 = records[0]?.play ?? "";
    const end = playOf(who, [], { play: play2, at: tuesday });
    await sendRecords(headers, end);
    expect((await homeOf(headers)).unseen).toHaveLength(1);
  });

  it("adds up effort across the week's plays", async () => {
    const { headers, who } = await student();
    // A play got right first time is worth its finish alone.
    for (let i = 1; i < rewardRule.effortPerReward; i++) {
      await play(headers, who, right(3), { at: tuesday });
      expect((await homeOf(headers)).unseen).toEqual([]);
    }
    await play(headers, who, right(3), { at: tuesday });
    expect((await homeOf(headers)).unseen).toHaveLength(1);
  });

  it("counts a play left partway for its improvements, not as finished", async () => {
    const { headers, who } = await student();
    await play(headers, who, improved(rewardRule.effortPerReward - 1), {
      ending: "left",
    });
    expect((await homeOf(headers)).unseen).toEqual([]);
    await play(headers, who, improved(rewardRule.effortPerReward), {
      ending: "left",
    });
    expect((await homeOf(headers)).unseen).toHaveLength(1);
  });

  it("grants nothing for a crashed play, and takes nothing away", async () => {
    const { headers, who } = await student();
    await play(headers, who, earning(1));
    await play(headers, who, earning(3), { ending: "crashed" });
    expect((await homeOf(headers)).unseen).toEqual(catalogue.slice(0, 1));
    // The crash didn't use up anything the next play earns.
    await play(headers, who, earning(1));
    expect((await homeOf(headers)).unseen).toEqual(catalogue.slice(0, 2));
  });

  it("grants a play once, however often its records are sent", async () => {
    const { headers, who } = await student();
    const records = await play(headers, who, earning(1));
    await sendRecords(headers, records);
    expect((await homeOf(headers)).unseen).toHaveLength(1);
  });

  it("counts home and class play the same, against one cap", async () => {
    const { headers, who } = await student();
    const other = await createClass(await teacher());
    await client.memberships.$post(
      { json: { joinCode: other.joinCode } },
      { headers },
    );
    await play(headers, who, earning(rewardRule.weeklyCap - 1));
    await play(headers, { ...who, classId: other.id }, earning(2));
    expect((await homeOf(headers)).unseen).toHaveLength(rewardRule.weeklyCap);
  });
});

describe("the weekly cap", () => {
  it("stops granting at the cap, and play goes on as normal", async () => {
    const { headers, who } = await student();
    await play(headers, who, earning(rewardRule.weeklyCap - 1));
    await play(headers, who, earning(3));
    const res = await sendRecords(headers, playOf(who, earning(2)));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ stored: expect.any(Number) });
    expect((await homeOf(headers)).unseen).toEqual(
      catalogue.slice(0, rewardRule.weeklyCap),
    );
  });

  it("starts again the next week", async () => {
    const { headers, who } = await student();
    await play(headers, who, earning(rewardRule.weeklyCap + 1), {
      at: tuesday,
    });
    await play(headers, who, earning(1), { at: nextTuesday });
    expect((await homeOf(headers)).unseen).toHaveLength(
      rewardRule.weeklyCap + 1,
    );
  });

  it("runs weeks Monday to Sunday in school time", async () => {
    const { headers, who } = await student();
    await play(headers, who, earning(rewardRule.weeklyCap), { at: tuesday });
    // 11:30 pm on Sunday in Toronto is already Monday in UTC.
    await play(headers, who, earning(1), {
      at: new Date("2026-10-26T03:30:00Z"),
    });
    expect((await homeOf(headers)).unseen).toHaveLength(rewardRule.weeklyCap);
    // Midnight on Monday in Toronto starts the next week.
    await play(headers, who, earning(1), {
      at: new Date("2026-10-26T04:00:30Z"),
    });
    expect((await homeOf(headers)).unseen).toHaveLength(
      rewardRule.weeklyCap + 1,
    );
  });

  it("grants a late batch against the cap of the week it was played", async () => {
    const { headers, who } = await student();
    await play(headers, who, earning(rewardRule.weeklyCap), {
      at: nextTuesday,
    });
    // Played offline last week, sent this week: last week had room.
    await play(headers, who, earning(1), { at: tuesday });
    expect((await homeOf(headers)).unseen).toHaveLength(
      rewardRule.weeklyCap + 1,
    );
  });

  it("grants a late batch nothing when the week it was played is full", async () => {
    const { headers, who } = await student();
    await play(headers, who, earning(rewardRule.weeklyCap), { at: tuesday });
    await play(headers, who, earning(1), {
      at: new Date(+tuesday + 60 * 60 * 1000),
    });
    expect((await homeOf(headers)).unseen).toHaveLength(rewardRule.weeklyCap);
  });
});

describe("what's new", () => {
  it("stays new until the student has seen it", async () => {
    const { headers, who } = await student();
    await play(headers, who, earning(2));
    const { unseen } = await homeOf(headers);
    expect((await homeOf(headers)).unseen).toEqual(unseen);

    expect((await markSeen(headers, unseen)).status).toBe(204);
    const after = await homeOf(headers);
    expect(after.unseen).toEqual([]);
    for (const id of unseen)
      expect([...after.owned, ...after.stickers]).toContain(id);
  });

  it("marks only what the student saw", async () => {
    const { headers, who } = await student();
    await play(headers, who, earning(2));
    const [first = "", second] = (await homeOf(headers)).unseen;
    await markSeen(headers, [first, "not-a-reward"]);
    expect((await homeOf(headers)).unseen).toEqual([second]);
  });

  it("keeps each student's home their own", async () => {
    const one = await student();
    const other = await student();
    await play(one.headers, one.who, earning(1));
    await play(other.headers, other.who, earning(1));
    await markSeen(other.headers, catalogue.slice(0, 1));
    expect((await homeOf(one.headers)).unseen).toEqual(catalogue.slice(0, 1));
  });

  it("needs a signed-in student", async () => {
    expect((await markSeen(undefined, [])).status).toBe(401);
    expect((await markSeen(await teacher(), [])).status).toBe(403);
  });
});

describe("what's new in the wardrobe", () => {
  /** The outfit pieces among the first `n` rewards granted. */
  const outfitIn = (n: number) =>
    catalogue.slice(0, n).filter((id) => rewardKind(id) === "outfit");

  it("marks every outfit piece granted as new in the wardrobe, and no sticker", async () => {
    const { headers, who } = await student();
    await play(headers, who, earning(3));
    const home = await homeOf(headers);
    expect(outfitIn(3).length).toBeGreaterThan(0);
    expect(home.newInWardrobe).toEqual(outfitIn(3));
  });

  it("keeps a piece new in the wardrobe after it's been revealed", async () => {
    const { headers, who } = await student();
    await play(headers, who, earning(3));
    await markSeen(headers, (await homeOf(headers)).unseen);
    expect((await homeOf(headers)).newInWardrobe).toEqual(outfitIn(3));
  });

  it("stops a piece being new once the student has seen it in the wardrobe, and only that piece", async () => {
    const { headers, who } = await student();
    await play(headers, who, earning(3));
    const [first = "", ...rest] = (await homeOf(headers)).newInWardrobe;
    expect(rest.length).toBeGreaterThan(0);

    const res = await markSeenInWardrobe(headers, [first, "not-a-reward"]);
    expect(res.status).toBe(204);
    const after = await homeOf(headers);
    expect(after.newInWardrobe).toEqual(rest);
    expect(after.owned).toContain(first);
  });

  it("keeps a piece seen in the wardrobe new at home until it's revealed", async () => {
    const { headers, who } = await student();
    await play(headers, who, earning(3));
    const before = await homeOf(headers);
    await markSeenInWardrobe(headers, before.newInWardrobe);
    expect((await homeOf(headers)).unseen).toEqual(before.unseen);
  });

  it("keeps each student's wardrobe their own", async () => {
    const one = await student();
    const other = await student();
    await play(one.headers, one.who, earning(3));
    await play(other.headers, other.who, earning(3));
    await markSeenInWardrobe(other.headers, outfitIn(3));
    expect((await homeOf(one.headers)).newInWardrobe).toEqual(outfitIn(3));
  });

  it("needs a signed-in student", async () => {
    expect((await markSeenInWardrobe(undefined, [])).status).toBe(401);
    expect((await markSeenInWardrobe(await teacher(), [])).status).toBe(403);
  });
});
