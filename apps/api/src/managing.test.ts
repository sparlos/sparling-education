import { describe, expect, it } from "vitest";
import { client, signInAsStudent } from "../test/client.ts";
import {
  createClass,
  joinedStudent,
  playOf,
  right,
  sendRecords,
  teacher,
  wrong,
} from "../test/plays.ts";

type Headers = { cookie: string };

async function sessionOf(headers: Headers) {
  const res = await client.session.$get(undefined, { headers });
  const session = await res.json();
  if (!session || "error" in session) throw new Error("No session");
  return session;
}

function switchGame(
  headers: Headers | undefined,
  classId: string,
  slug: string,
  on: boolean,
) {
  return client.classes[":classId"].games[":slug"].$put(
    { param: { classId, slug }, json: { on } },
    { headers },
  );
}

function studentsOf(headers: Headers | undefined, classId: string) {
  return client.classes[":classId"].students.$get(
    { param: { classId } },
    { headers },
  );
}

function changeGrade(
  headers: Headers | undefined,
  classId: string,
  studentId: string,
  grade: number,
) {
  return client.classes[":classId"].students[":studentId"].grade.$put(
    { param: { classId, studentId }, json: { grade } },
    { headers },
  );
}

function remove(
  headers: Headers | undefined,
  classId: string,
  studentId: string,
) {
  return client.classes[":classId"].students[":studentId"].$delete(
    { param: { classId, studentId } },
    { headers },
  );
}

/** The response's body, once it's the success it should be. */
async function ok<R extends { status: number; json(): Promise<unknown> }>(
  res: R,
) {
  if (res.status >= 300) throw new Error(`Answered ${res.status}`);
  return (await res.json()) as Exclude<
    Awaited<ReturnType<R["json"]>>,
    { error: string }
  >;
}

async function dashboardOf(headers: Headers, classId: string) {
  const res = await client.classes[":classId"].dashboard.$get(
    { param: { classId } },
    { headers },
  );
  if (res.status !== 200) throw new Error(`Dashboard failed: ${res.status}`);
  return res.json();
}

async function play(headers: Headers, records: ReturnType<typeof playOf>) {
  const res = await sendRecords(headers, records);
  if (res.status !== 200) throw new Error(`Send failed: ${res.status}`);
}

const day = (n: number) => new Date(Date.UTC(2026, 9, n, 14));

describe("turning a game off and on", () => {
  it("takes it out of the class's students' homes, and puts it back", async () => {
    const headers = await teacher();
    const cls = await createClass(headers);
    const sam = await joinedStudent(cls);

    const off = await switchGame(headers, cls.id, "fraction-hop", false);
    expect(off.status).toBe(200);
    expect((await ok(off)).games).toEqual([
      expect.objectContaining({ slug: "fraction-hop", on: false }),
      expect.objectContaining({ slug: "crystal-machine", on: true }),
      expect.objectContaining({ slug: "cargo-line", on: true }),
      expect.objectContaining({ slug: "dart-towers", on: true }),
    ]);
    expect((await sessionOf(sam.headers)).classes[0]?.games).toEqual([
      { slug: "crystal-machine", name: "Crystal Machine" },
      { slug: "cargo-line", name: "Cargo Line" },
      { slug: "dart-towers", name: "Dart Towers" },
    ]);

    // Turning it off again changes nothing.
    await switchGame(headers, cls.id, "fraction-hop", false);
    const on = await switchGame(headers, cls.id, "fraction-hop", true);
    expect((await ok(on)).games).toEqual([
      expect.objectContaining({ slug: "fraction-hop", on: true }),
      expect.objectContaining({ slug: "crystal-machine", on: true }),
      expect.objectContaining({ slug: "cargo-line", on: true }),
      expect.objectContaining({ slug: "dart-towers", on: true }),
    ]);
    expect((await sessionOf(sam.headers)).classes[0]?.games).toEqual([
      { slug: "fraction-hop", name: "Fraction Hop" },
      { slug: "crystal-machine", name: "Crystal Machine" },
      { slug: "cargo-line", name: "Cargo Line" },
      { slug: "dart-towers", name: "Dart Towers" },
    ]);
  });

  it("is only for the class's teacher, and only for a game the platform hosts", async () => {
    const headers = await teacher();
    const cls = await createClass(headers);
    expect(
      (await switchGame(headers, cls.id, "no-such-game", false)).status,
    ).toBe(404);
    expect(
      (await switchGame(await teacher(), cls.id, "fraction-hop", false)).status,
    ).toBe(404);
    expect(
      (await switchGame(await signInAsStudent(), cls.id, "fraction-hop", false))
        .status,
    ).toBe(403);
    expect(
      (await switchGame(undefined, cls.id, "fraction-hop", false)).status,
    ).toBe(401);
    const [game] = (
      await ok(
        await client.classes[":classId"].$get(
          { param: { classId: cls.id } },
          { headers },
        ),
      )
    ).games;
    expect(game?.on).toBe(true);
  });
});

describe("a class's students", () => {
  it("lists them by name, with their grade in the class", async () => {
    const headers = await teacher();
    const cls = await createClass(headers, [4, 5]);
    await joinedStudent(cls, { name: ["Zoe", "Abbot"], grade: 5 });
    await joinedStudent(cls, { name: ["Ana", "Diaz"] });
    const res = await studentsOf(headers, cls.id);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      {
        id: expect.any(String),
        firstName: "Ana",
        lastInitial: "D",
        grade: null,
      },
      { id: expect.any(String), firstName: "Zoe", lastInitial: "A", grade: 5 },
    ]);
  });

  it("are only for the class's teacher", async () => {
    const cls = await createClass(await teacher());
    expect((await studentsOf(await teacher(), cls.id)).status).toBe(404);
    expect((await studentsOf(await signInAsStudent(), cls.id)).status).toBe(
      403,
    );
    expect((await studentsOf(undefined, cls.id)).status).toBe(401);
  });
});

describe("changing a student's grade", () => {
  it("sets the tier of their next plays, and keeps their results' tiers", async () => {
    const headers = await teacher();
    const cls = await createClass(headers, [4, 5]);
    const sam = await joinedStudent(cls, { grade: 4 });
    const who = { studentId: sam.studentId, classId: cls.id };
    await play(sam.headers, playOf(who, right(4), { grade: 4, at: day(1) }));

    const res = await changeGrade(headers, cls.id, sam.studentId, 5);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: sam.studentId,
      firstName: "Sam",
      lastInitial: "R",
      grade: 5,
    });
    expect((await sessionOf(sam.headers)).classes[0]?.grade).toBe(5);

    // The Grade 4 result keeps its tier, now marked as another tier's.
    const [before] = (await dashboardOf(headers, cls.id)).students;
    expect(before?.grade).toBe(5);
    expect(before?.results).toEqual([
      expect.objectContaining({
        expectation: "math-2020.g4.B1.6",
        tierGrade: 4,
        otherTier: true,
      }),
    ]);

    await play(sam.headers, playOf(who, wrong(4), { grade: 5, at: day(2) }));
    const [after] = (await dashboardOf(headers, cls.id)).students;
    expect(after?.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          expectation: "math-2020.g4.B1.6",
          understanding: "showing-consistently",
          tierGrade: 4,
          otherTier: true,
        }),
        expect.objectContaining({
          expectation: "math-2020.g5.B1.3",
          understanding: "not-yet-showing",
          tierGrade: 5,
          otherTier: false,
        }),
      ]),
    );
  });

  it("sets the grade of a split-class student who hasn't picked one, who then can't pick", async () => {
    const headers = await teacher();
    const cls = await createClass(headers, [3, 4]);
    const sam = await joinedStudent(cls);
    expect((await changeGrade(headers, cls.id, sam.studentId, 3)).status).toBe(
      200,
    );
    const picked = await client.memberships[":classId"].grade.$put(
      { param: { classId: cls.id }, json: { grade: 4 } },
      { headers: sam.headers },
    );
    expect(picked.status).toBe(409);
    expect((await sessionOf(sam.headers)).classes[0]?.grade).toBe(3);
  });

  it("only to one of the class's grades, and only by the class's teacher", async () => {
    const headers = await teacher();
    const cls = await createClass(headers, [4, 5]);
    const sam = await joinedStudent(cls, { grade: 4 });
    const other = await joinedStudent(await createClass(headers, [4, 5]), {
      grade: 4,
    });
    expect((await changeGrade(headers, cls.id, sam.studentId, 3)).status).toBe(
      400,
    );
    expect(
      (await changeGrade(headers, cls.id, other.studentId, 5)).status,
    ).toBe(404);
    expect(
      (await changeGrade(await teacher(), cls.id, sam.studentId, 5)).status,
    ).toBe(404);
    expect(
      (await changeGrade(sam.headers, cls.id, sam.studentId, 5)).status,
    ).toBe(403);
    expect(
      (await changeGrade(undefined, cls.id, sam.studentId, 5)).status,
    ).toBe(401);
    expect((await sessionOf(sam.headers)).classes[0]?.grade).toBe(4);
  });
});

describe("removing a student", () => {
  it("takes them out of the class's dashboard and their home, and keeps their results out of sight", async () => {
    const headers = await teacher();
    const cls = await createClass(headers);
    const kept = await createClass(headers);
    const sam = await joinedStudent(cls);
    const ana = await joinedStudent(cls, { name: ["Ana", "Diaz"] });
    await client.memberships.$post(
      { json: { joinCode: kept.joinCode } },
      { headers: sam.headers },
    );
    const who = { studentId: sam.studentId, classId: cls.id };
    const records = playOf(who, [
      [{ succeeded: true, misconception: "bigger-denominator-bigger" }],
    ]);
    await play(sam.headers, records);

    const res = await remove(headers, cls.id, sam.studentId);
    expect(res.status).toBe(204);

    const dashboard = await dashboardOf(headers, cls.id);
    expect(dashboard.students.map((s) => s.id)).toEqual([ana.studentId]);
    expect(dashboard.misconceptions).toEqual([]);
    expect(
      (await ok(await studentsOf(headers, cls.id))).map((s) => s.id),
    ).toEqual([ana.studentId]);
    const evidence = await client.classes[":classId"].students[
      ":studentId"
    ].expectations[":expectationId"].$get(
      {
        param: {
          classId: cls.id,
          studentId: sam.studentId,
          expectationId: "math-2020.g4.B1.6",
        },
      },
      { headers },
    );
    expect(evidence.status).toBe(404);
    const opened = await client.classes[":classId"].students[
      ":studentId"
    ].plays[":play"].$get(
      {
        param: {
          classId: cls.id,
          studentId: sam.studentId,
          play: records[0]?.play ?? "",
        },
      },
      { headers },
    );
    expect(opened.status).toBe(404);

    // Their home lists only the class they're still in, and the removed
    // class takes no more of their plays.
    expect(
      (await sessionOf(sam.headers)).classes.map((c) => c.classId),
    ).toEqual([kept.id]);
    expect((await sendRecords(sam.headers, playOf(who, right(1)))).status).toBe(
      400,
    );
  });

  it("brings their results back if they join again", async () => {
    const headers = await teacher();
    const cls = await createClass(headers);
    const sam = await joinedStudent(cls);
    await play(
      sam.headers,
      playOf({ studentId: sam.studentId, classId: cls.id }, right(4)),
    );
    await remove(headers, cls.id, sam.studentId);
    await client.memberships.$post(
      { json: { joinCode: cls.joinCode } },
      { headers: sam.headers },
    );
    const [back] = (await dashboardOf(headers, cls.id)).students;
    expect(back?.results).toEqual([
      expect.objectContaining({ understanding: "showing-consistently" }),
    ]);
  });

  it("is only for the class's teacher, and only a student in the class", async () => {
    const headers = await teacher();
    const cls = await createClass(headers);
    const sam = await joinedStudent(cls);
    const other = await joinedStudent(await createClass(headers));
    expect((await remove(headers, cls.id, other.studentId)).status).toBe(404);
    expect((await remove(await teacher(), cls.id, sam.studentId)).status).toBe(
      404,
    );
    expect((await remove(sam.headers, cls.id, sam.studentId)).status).toBe(403);
    expect((await remove(undefined, cls.id, sam.studentId)).status).toBe(401);
    expect((await sessionOf(sam.headers)).classes).toHaveLength(1);
  });
});
