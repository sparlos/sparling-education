import { describe, expect, it } from "vitest";
import {
  client,
  cookiesFrom,
  google,
  postStudentSignIn,
  signInAsStudent,
} from "../test/client.ts";

type Headers = { cookie: string };

async function teacher(credential = google.credentialFor()) {
  const res = await client["sign-in"].$post({
    json: { credential, as: "teacher" },
  });
  if (res.status !== 200) throw new Error(`Sign-in failed: ${res.status}`);
  return cookiesFrom(res);
}

async function newClass(grades: (3 | 4 | 5)[], name = "Room 12") {
  const res = await client.classes.$post(
    { json: { name, grades } },
    { headers: await teacher() },
  );
  if (res.status !== 201) throw new Error(`Create failed: ${res.status}`);
  return res.json();
}

async function sessionOf(headers?: Headers) {
  const res = await client.session.$get(undefined, { headers });
  if (res.status !== 200) throw new Error(`Session failed: ${res.status}`);
  return res.json();
}

function join(headers: Headers | undefined, joinCode: string) {
  return client.memberships.$post({ json: { joinCode } }, { headers });
}

async function joined(headers: Headers, joinCode: string) {
  const res = await join(headers, joinCode);
  if (res.status !== 200) throw new Error(`Join failed: ${res.status}`);
  return res.json();
}

function pick(headers: Headers | undefined, classId: string, grade: number) {
  return client.memberships[":classId"].grade.$put(
    { param: { classId }, json: { grade } },
    { headers },
  );
}

const fractionHop = { slug: "fraction-hop", name: "Fraction Hop" };
const crystalMachine = { slug: "crystal-machine", name: "Crystal Machine" };

describe("student sign-in", () => {
  it("makes a student of a new Google account and returns to the play shell's sign-in page", async () => {
    const res = await postStudentSignIn(google.credentialFor());
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/play/sign-in");
    const headers = cookiesFrom(res);
    const account = await client.account.$get(undefined, { headers });
    expect(await account.json()).toMatchObject({ role: "student" });
  });

  it("holds the session in the same HTTP-only, same-site cookie as the teacher app", async () => {
    const res = await postStudentSignIn(google.credentialFor());
    const [cookie] = res.headers.getSetCookie();
    expect(cookie).toMatch(/^session=[^;]+/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
  });

  it("finds the same student again", async () => {
    const first = await signInAsStudent(google.credentialFor({ sub: "g-s" }));
    const again = await signInAsStudent(google.credentialFor({ sub: "g-s" }));
    expect((await sessionOf(again))?.id).toBe((await sessionOf(first))?.id);
  });

  it("keeps a teacher a teacher, who then can't use the play shell's session", async () => {
    await teacher(google.credentialFor({ sub: "g-teacher" }));
    const headers = await signInAsStudent(
      google.credentialFor({ sub: "g-teacher" }),
    );
    const res = await client.session.$get(undefined, { headers });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "not-a-student" });
  });

  it.each([
    ["no double-submit cookie", { cookie: null }],
    ["a cookie that doesn't match the form", { cookie: "something-else" }],
  ])("refuses a form with %s, without starting a session", async (_, csrf) => {
    const res = await postStudentSignIn(google.credentialFor(), csrf);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/play/sign-in?failed");
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("refuses a credential Google didn't issue", async () => {
    const res = await postStudentSignIn("forged");
    expect(res.headers.get("location")).toBe("/play/sign-in?failed");
    expect(res.headers.getSetCookie()).toEqual([]);
  });
});

describe("the session", () => {
  it("is null when signed out", async () => {
    expect(await sessionOf()).toBeNull();
    expect(await sessionOf({ cookie: "session=made-up" })).toBeNull();
  });

  it("gives a new student an opaque ID, no look until they design one, and no classes", async () => {
    const session = await sessionOf(await signInAsStudent());
    expect(session).toEqual({
      id: expect.any(String),
      locale: "en-CA",
      look: null,
      classes: [],
    });
  });
});

describe("joining a class", () => {
  it("sets the grade of a student joining a single-grade class", async () => {
    const room = await newClass([4], "Room 12");
    const headers = await signInAsStudent();
    const membership = {
      classId: room.id,
      className: "Room 12",
      classColour: "indigo",
      grades: [4],
      grade: 4,
      games: [fractionHop, crystalMachine],
    };
    expect(await joined(headers, room.joinCode)).toEqual(membership);
    expect((await sessionOf(headers))?.classes).toEqual([membership]);
  });

  it("leaves the grade of a student joining a split class for them to pick", async () => {
    const room = await newClass([3, 4], "Room 14");
    const headers = await signInAsStudent();
    expect(await joined(headers, room.joinCode)).toMatchObject({
      grades: [3, 4],
      grade: null,
    });
  });

  it("reads the join code whatever its case", async () => {
    const room = await newClass([4]);
    const res = await join(
      await signInAsStudent(),
      ` ${room.joinCode.toLowerCase()} `,
    );
    expect(res.status).toBe(200);
  });

  it("changes nothing for a student who joins again", async () => {
    const room = await newClass([3, 4]);
    const headers = await signInAsStudent();
    await joined(headers, room.joinCode);
    await pick(headers, room.id, 3);
    expect(await joined(headers, room.joinCode)).toMatchObject({ grade: 3 });
    expect((await sessionOf(headers))?.classes).toHaveLength(1);
  });

  it("lists every class a student is in, in the order they joined", async () => {
    const first = await newClass([5], "Math");
    const second = await newClass([3, 4], "Homeroom");
    const headers = await signInAsStudent();
    await joined(headers, second.joinCode);
    await joined(headers, first.joinCode);
    expect((await sessionOf(headers))?.classes).toEqual([
      expect.objectContaining({ classId: second.id, grade: null }),
      expect.objectContaining({ classId: first.id, grade: 5 }),
    ]);
  });

  it("lists only the classes of the student who's signed in", async () => {
    const room = await newClass([4]);
    await joined(await signInAsStudent(), room.joinCode);
    expect((await sessionOf(await signInAsStudent()))?.classes).toEqual([]);
  });

  it("says when no class has the join code", async () => {
    const res = await join(await signInAsStudent(), "NOSUCHCD");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "no-such-class" });
  });

  it("needs a signed-in student; a teacher can't join as one", async () => {
    const room = await newClass([4]);
    expect((await join(undefined, room.joinCode)).status).toBe(401);
    const res = await join(await teacher(), room.joinCode);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "not-a-student" });
  });
});

describe("picking a grade in a split class", () => {
  it("sets the grade the student picks from the class's grades", async () => {
    const room = await newClass([3, 4, 5]);
    const headers = await signInAsStudent();
    await joined(headers, room.joinCode);
    const res = await pick(headers, room.id, 5);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ classId: room.id, grade: 5 });
    expect((await sessionOf(headers))?.classes).toEqual([
      expect.objectContaining({ grade: 5 }),
    ]);
  });

  it("refuses a grade the class doesn't have", async () => {
    const room = await newClass([3, 4]);
    const headers = await signInAsStudent();
    await joined(headers, room.joinCode);
    expect((await pick(headers, room.id, 5)).status).toBe(400);
    expect((await sessionOf(headers))?.classes[0]?.grade).toBeNull();
  });

  it("lets the student pick only once", async () => {
    const room = await newClass([3, 4]);
    const headers = await signInAsStudent();
    await joined(headers, room.joinCode);
    await pick(headers, room.id, 3);
    const res = await pick(headers, room.id, 4);
    expect(res.status).toBe(409);
    expect((await sessionOf(headers))?.classes[0]?.grade).toBe(3);
  });

  it("can't be picked in a single-grade class, where it's set already", async () => {
    const room = await newClass([4]);
    const headers = await signInAsStudent();
    await joined(headers, room.joinCode);
    expect((await pick(headers, room.id, 4)).status).toBe(409);
  });

  it("only works in a class the student is in", async () => {
    const room = await newClass([3, 4]);
    const res = await pick(await signInAsStudent(), room.id, 3);
    expect(res.status).toBe(404);
  });

  it("needs a signed-in student", async () => {
    const room = await newClass([3, 4]);
    expect((await pick(undefined, room.id, 3)).status).toBe(401);
    expect((await pick(await teacher(), room.id, 3)).status).toBe(403);
  });
});
