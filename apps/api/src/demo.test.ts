import { randomUUID } from "node:crypto";
import { manifest as fractionHop } from "@games/fraction-hop/manifest";
import { attemptProblem } from "@repo/game-contract";
import { maxStickerTilt, recognitionSticker } from "@repo/rewards";
import { testClient } from "hono/testing";
import { describe, expect, it } from "vitest";
import { cookiesFrom, db, google, signInAsStudent } from "../test/client.ts";
import { createApp } from "./app.ts";
import { hostedGames } from "./games.ts";

type Headers = { cookie: string };

// This file's app gives new teachers their demo class, as the deployed one does.
const now = new Date("2026-10-28T15:00:00Z");
const client = testClient(
  createApp({ db, identity: google.verifier, clock: () => now }),
);

async function signIn(credential = google.credentialFor()): Promise<Headers> {
  const res = await client["sign-in"].$post({
    json: { credential, as: "teacher" },
  });
  if (res.status !== 200) throw new Error(`Sign-in failed: ${res.status}`);
  return cookiesFrom(res);
}

async function classesOf(headers: Headers) {
  const res = await client.classes.$get(undefined, { headers });
  if (res.status !== 200) throw new Error(`Classes failed: ${res.status}`);
  return res.json();
}

async function demoOf(headers: Headers) {
  const demo = (await classesOf(headers)).find((c) => c.demo);
  if (!demo) throw new Error("No demo class");
  return demo;
}

/** A response's body, when it's a 200. */
async function get<R extends { status: number; json(): Promise<unknown> }>(
  res: Promise<R>,
): Promise<Awaited<ReturnType<Extract<R, { status: 200 }>["json"]>>> {
  const done = await res;
  if (done.status !== 200) throw new Error(`Answered ${done.status}`);
  return done.json() as never;
}

const dashboardOf = (headers: Headers, classId: string) =>
  get(
    client.classes[":classId"].dashboard.$get(
      { param: { classId } },
      { headers },
    ),
  );

const studentsOf = (headers: Headers, classId: string) =>
  get(
    client.classes[":classId"].students.$get(
      { param: { classId } },
      { headers },
    ),
  );

async function viewAsStudent(headers: Headers) {
  const res = await client["demo-class"]["view-as-student"].$post(undefined, {
    headers,
  });
  if (res.status !== 200) throw new Error(`View as failed: ${res.status}`);
  return res.json();
}

/** Every one of a demo student's plays, through their evidence. */
async function playsOf(headers: Headers, classId: string, studentId: string) {
  const { results } = await get(
    client.classes[":classId"].students[":studentId"].$get(
      { param: { classId, studentId } },
      { headers },
    ),
  );
  const plays = [];
  for (const { expectation } of results) {
    const evidence = await get(
      client.classes[":classId"].students[":studentId"].expectations[
        ":expectationId"
      ].$get(
        { param: { classId, studentId, expectationId: expectation.id } },
        { headers },
      ),
    );
    for (const { play } of evidence.plays)
      plays.push(
        await get(
          client.classes[":classId"].students[":studentId"].plays[":play"].$get(
            { param: { classId, studentId, play } },
            { headers },
          ),
        ),
      );
  }
  return plays;
}

describe("the demo class", () => {
  it("is indigo, and doesn't stop a teacher's first class of their own being indigo too", async () => {
    const headers = await signIn();
    const [demo] = await classesOf(headers);
    expect(demo?.colour).toBe("indigo");
    const res = await client.classes.$post(
      { json: { name: "Room 12", grades: [4] } },
      { headers },
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ colour: "indigo" });
  });

  it("is given at a teacher's first sign-in, labelled, with 24 students across Grades 3–5", async () => {
    const headers = await signIn();
    const classes = await classesOf(headers);
    expect(classes).toEqual([
      expect.objectContaining({
        name: "Demo class",
        grades: [3, 4, 5],
        demo: true,
      }),
    ]);
    const students = await studentsOf(headers, classes[0]?.id ?? "");
    expect(students).toHaveLength(24);
    for (const grade of [3, 4, 5])
      expect(students.filter((s) => s.grade === grade)).toHaveLength(8);
  });

  it("has results in for every student, and misconceptions several students share", async () => {
    const headers = await signIn();
    const demo = await demoOf(headers);
    const dashboard = await dashboardOf(headers, demo.id);
    for (const student of dashboard.students)
      expect(student.results.length, student.firstName).toBeGreaterThan(0);
    const bands = new Set(
      dashboard.students.flatMap((s) => s.results.map((r) => r.understanding)),
    );
    expect(bands).toEqual(
      new Set(["not-yet-showing", "developing", "showing-consistently"]),
    );
    // Every one of the games' misconceptions, each shown by several students.
    expect(dashboard.misconceptions.map((m) => m.id).sort()).toEqual(
      hostedGames.flatMap((g) => Object.keys(g.manifest.misconceptions)).sort(),
    );
    for (const m of dashboard.misconceptions)
      expect(m.students.length, m.id).toBeGreaterThanOrEqual(2);
  });

  it("has plays that look like real ones: every try, with what was asked and what each try did", async () => {
    const headers = await signIn();
    const demo = await demoOf(headers);
    const { students } = await dashboardOf(headers, demo.id);
    const plays = (
      await Promise.all(
        students.slice(0, 6).map((s) => playsOf(headers, demo.id, s.id)),
      )
    ).flat();
    expect(plays.length).toBeGreaterThan(0);
    const tries = plays.flatMap((p) => p.tasks.flatMap((t) => t.attempts));
    for (const play of plays)
      for (const task of play.tasks) {
        expect(task.asked).toBeTruthy();
        for (const attempt of task.attempts) {
          expect(attempt.detail).toBeTruthy();
          const { manifest } = hostedGames.find(
            (g) => g.slug === play.game,
          ) as (typeof hostedGames)[number];
          expect(
            attemptProblem(
              manifest,
              play.tier,
              {
                task: task.task,
                expectation: task.expectation,
                succeeded: attempt.succeeded,
                ...(attempt.misconception && {
                  misconception: attempt.misconception.id,
                }),
                ...(attempt.assisted && { assisted: attempt.assisted }),
                exploring: attempt.exploring,
              },
              undefined,
            ),
          ).toBeNull();
        }
      }
    expect(tries.some((t) => t.exploring)).toBe(true);
    expect(tries.some((t) => !t.succeeded && !t.exploring)).toBe(true);
    expect(tries.some((t) => t.assisted !== null)).toBe(true);
    expect(new Set(plays.map((p) => p.ending))).toEqual(
      new Set(["finished", "left"]),
    );
  });

  it("gives its students effort, and rewards from it", async () => {
    const headers = await signIn();
    const demo = await demoOf(headers);
    const { students } = await dashboardOf(headers, demo.id);
    for (const { id } of students) {
      const page = await get(
        client.classes[":classId"].students[":studentId"].$get(
          { param: { classId: demo.id, studentId: id } },
          { headers },
        ),
      );
      const effort = page.effort.flatMap((s) => s.evidence.map((e) => e.count));
      expect(effort.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    }
    await viewAsStudent(headers);
    const home = await get(client.home.$get(undefined, { headers }));
    expect(home.stickers.length).toBeGreaterThan(0);
  });

  it("has some students recognised already, this term and last", async () => {
    const headers = await signIn();
    const demo = await demoOf(headers);
    const { students } = await dashboardOf(headers, demo.id);
    const recognised = Object.fromEntries(
      students.map((s) => [s.firstName, s.recognised]),
    );
    expect(recognised).toMatchObject({
      Amara: ["kindness"],
      Léa: ["kindness", "leadership"],
      Tessa: ["leadership"],
      // Last term's recognition shows on their page, not as this term's.
      Nadia: [],
    });
    expect(students.filter((s) => s.recognised.length > 0)).toHaveLength(6);
    const nadia = students.find((s) => s.firstName === "Nadia");
    const page = await get(
      client.classes[":classId"].students[":studentId"].$get(
        { param: { classId: demo.id, studentId: nadia?.id ?? "" } },
        { headers },
      ),
    );
    expect(page.recognised).toEqual([
      { trait: "perseverance", awardedAt: expect.any(String) },
    ]);
    expect(+new Date(page.recognised[0]?.awardedAt ?? "")).toBeLessThan(
      +new Date(page.recognition.term.start),
    );
  });

  it("reveals the recognition sticker as new to the student viewed as", async () => {
    const headers = await signIn();
    await viewAsStudent(headers);
    const home = await get(client.home.$get(undefined, { headers }));
    expect(home.stickers).toContain(recognitionSticker("kindness"));
    expect(home.unseen).toContain(recognitionSticker("kindness"));
  });

  it("fills the viewed student's locker: a keepsake for each game, the newest new, and stickers they've seen", async () => {
    const headers = await signIn();
    await viewAsStudent(headers);
    const home = await get(client.home.$get(undefined, { headers }));
    expect(home.keepsakes).toEqual(hostedGames.map((g) => g.slug));
    expect(home.newKeepsakes).toEqual(home.keepsakes.slice(-1));
    expect(home.placements.length).toBeGreaterThan(0);
    for (const p of home.placements) {
      expect(home.stickers).toContain(p.sticker);
      expect(home.unseen).not.toContain(p.sticker);
      expect(Math.abs(p.tilt)).toBeLessThanOrEqual(maxStickerTilt);
    }
    // What's new is still in the tray.
    expect(home.unseen.filter((id) => home.stickers.includes(id))).not.toEqual(
      [],
    );
  });

  it("is the same for every teacher, apart from its IDs", async () => {
    const shapeOf = async (headers: Headers) => {
      const demo = await demoOf(headers);
      const dashboard = await dashboardOf(headers, demo.id);
      const names = new Map(
        dashboard.students.map((s) => [
          s.id,
          `${s.firstName} ${s.lastInitial}`,
        ]),
      );
      const named = JSON.parse(
        JSON.stringify(dashboard).replace(
          /"[0-9a-f-]{36}"/g,
          (id) => `"${names.get(id.slice(1, -1)) ?? "id"}"`,
        ),
      );
      const [first] = dashboard.students;
      const plays = await playsOf(headers, demo.id, first?.id ?? "");
      return {
        dashboard: named,
        plays: plays.map(({ play: _, student: __, ...p }) => p),
      };
    };
    expect(await shapeOf(await signIn())).toEqual(
      await shapeOf(await signIn()),
    );
  });

  it("is given once: signing in again doesn't give another", async () => {
    const credential = google.credentialFor();
    await signIn(credential);
    const again = await signIn(credential);
    expect((await classesOf(again)).filter((c) => c.demo)).toHaveLength(1);
  });

  it("stays apart from the teacher's real classes", async () => {
    const headers = await signIn();
    const made = await client.classes.$post(
      { json: { name: "Room 12", grades: [4] } },
      { headers },
    );
    const real = await made.json();
    if (!("id" in real)) throw new Error("No class");
    expect(real.demo).toBe(false);
    expect(await studentsOf(headers, real.id)).toEqual([]);
    expect((await dashboardOf(headers, real.id)).students).toEqual([]);
  });

  it("can't be joined by a real student", async () => {
    const headers = await signIn();
    const demo = await demoOf(headers);
    const joining = await client.memberships.$post(
      { json: { joinCode: demo.joinCode } },
      { headers: await signInAsStudent() },
    );
    expect(joining.status).toBe(404);
    expect(await studentsOf(headers, demo.id)).toHaveLength(24);
  });
});

describe("viewing as a demo student", () => {
  it("opens the play shell as one of the demo class's students, in only that class", async () => {
    const headers = await signIn();
    const demo = await demoOf(headers);
    const view = await viewAsStudent(headers);
    expect(view.path).toBe("/play/");
    const session = await get(client.session.$get(undefined, { headers }));
    expect(session).toMatchObject({
      id: view.student.id,
      look: expect.any(Object),
      classes: [expect.objectContaining({ classId: demo.id, grade: 3 })],
    });
    // The teacher app still sees the teacher.
    expect((await classesOf(headers)).map((c) => c.id)).toEqual([demo.id]);
  });

  it("counts plays made there only in the demo class", async () => {
    const headers = await signIn();
    const demo = await demoOf(headers);
    const real = await (
      await client.classes.$post(
        { json: { name: "Room 12", grades: [3] } },
        { headers },
      )
    ).json();
    if (!("id" in real)) throw new Error("No class");
    const { student } = await viewAsStudent(headers);

    // A real class's link can't take them out of the demo class.
    const joining = await client.memberships.$post(
      { json: { joinCode: real.joinCode } },
      { headers },
    );
    expect(joining.status).toBe(404);

    const play = randomUUID();
    const record = (classId: string, at: string) => ({
      id: randomUUID(),
      play,
      student: student.id,
      class: classId,
      game: "fraction-hop",
      gameVersion: fractionHop.version,
      tier: "g3",
      at,
    });
    const attempt = {
      kind: "attempt" as const,
      task: "task-1",
      expectation: "math-2020.g3.B2.8",
      succeeded: true,
    };
    const toReal = await client["play-records"].$post(
      { json: [{ ...record(real.id, now.toISOString()), ...attempt }] },
      { headers },
    );
    expect(toReal.status).toBe(400);

    const before = await playsOf(headers, demo.id, student.id);
    const sent = await client["play-records"].$post(
      {
        json: [
          { ...record(demo.id, now.toISOString()), ...attempt },
          {
            ...record(demo.id, now.toISOString()),
            kind: "end" as const,
            ending: "finished" as const,
          },
        ],
      },
      { headers },
    );
    expect(sent.status).toBe(200);
    const after = await playsOf(headers, demo.id, student.id);
    expect(after.map((p) => p.play)).toContain(play);
    expect(after.length).toBe(before.length + 1);
    expect((await dashboardOf(headers, real.id)).students).toEqual([]);
  });

  it("is only for teachers", async () => {
    const res = await client["demo-class"]["view-as-student"].$post(undefined, {
      headers: await signInAsStudent(),
    });
    expect(res.status).toBe(403);
  });
});

describe("deleting the demo class", () => {
  it("removes it and everything in it in one step, for good", async () => {
    const credential = google.credentialFor();
    const headers = await signIn(credential);
    const demo = await demoOf(headers);
    const { students } = await dashboardOf(headers, demo.id);
    await viewAsStudent(headers);

    const res = await client["demo-class"].$delete(undefined, { headers });
    expect(res.status).toBe(204);
    expect(await classesOf(headers)).toEqual([]);
    const gone = await client.classes[":classId"].$get(
      { param: { classId: demo.id } },
      { headers },
    );
    expect(gone.status).toBe(404);
    // No longer viewing as anyone.
    expect((await client.session.$get(undefined, { headers })).status).toBe(
      403,
    );
    // Nothing of its students is left: no endpoint can see what a deleted
    // class leaves behind, so this one looks in the database.
    const ids = students.map((s) => s.id);
    expect(await db.account.count({ where: { id: { in: ids } } })).toBe(0);
    expect(await db.playRecord.count({ where: { classId: demo.id } })).toBe(0);
    expect(await db.reward.count({ where: { studentId: { in: ids } } })).toBe(
      0,
    );

    // It never comes back.
    expect(await classesOf(await signIn(credential))).toEqual([]);
    expect(
      (await client["demo-class"].$delete(undefined, { headers })).status,
    ).toBe(404);
  });

  it("deletes only the teacher's own demo class", async () => {
    const mine = await signIn();
    const theirs = await signIn();
    const theirDemo = await demoOf(theirs);
    await client["demo-class"].$delete(undefined, { headers: mine });
    expect(await classesOf(theirs)).toEqual([theirDemo]);
  });

  it("is only for teachers", async () => {
    const res = await client["demo-class"].$delete(undefined, {
      headers: await signInAsStudent(),
    });
    expect(res.status).toBe(403);
  });
});
