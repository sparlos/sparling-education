import { describe, expect, it } from "vitest";
import {
  client,
  cookiesFrom,
  google,
  signInAsStudent,
} from "../test/client.ts";

/** A new teacher's browser: the headers that act as them. */
async function teacher() {
  const res = await client["sign-in"].$post({
    json: { credential: google.credentialFor(), as: "teacher" },
  });
  if (res.status !== 200) throw new Error(`Sign-in failed: ${res.status}`);
  return cookiesFrom(res);
}

/** A new student's browser. */
function student() {
  return signInAsStudent();
}

async function createClass(
  headers: { cookie: string },
  json: { name: string; grades: (3 | 4 | 5)[] } = {
    name: "Room 12",
    grades: [4],
  },
) {
  const res = await client.classes.$post({ json }, { headers });
  if (res.status !== 201) throw new Error(`Create failed: ${res.status}`);
  return res.json();
}

async function classesOf(headers: { cookie: string }) {
  const res = await client.classes.$get(undefined, { headers });
  if (res.status !== 200) throw new Error(`List failed: ${res.status}`);
  return res.json();
}

describe("creating a class", () => {
  it("gives a new teacher no classes", async () => {
    expect(await classesOf(await teacher())).toEqual([]);
  });

  it("makes a class with its name, grades and a join code, with every game on", async () => {
    const created = await createClass(await teacher(), {
      name: "  Room 12  ",
      grades: [5, 4, 4],
    });
    expect(created).toEqual({
      id: expect.any(String),
      name: "Room 12",
      grades: [4, 5],
      demo: false,
      colour: "teal",
      joinCode: expect.stringMatching(/^[A-Z2-9]{8}$/),
      joinPath: `/play/join/${created.joinCode}`,
      games: [
        {
          slug: "fraction-hop",
          name: "Fraction Hop",
          on: true,
          path: `/play/fraction-hop?join=${created.joinCode}`,
        },
      ],
    });
  });

  it("lists the teacher's classes, oldest first, and finds each by ID", async () => {
    const headers = await teacher();
    const first = await createClass(headers, { name: "Room 12", grades: [3] });
    const second = await createClass(headers, {
      name: "Room 14",
      grades: [3, 4, 5],
    });
    expect(await classesOf(headers)).toEqual([first, second]);

    const res = await client.classes[":classId"].$get(
      { param: { classId: second.id } },
      { headers },
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(second);
  });

  it("gives every class its own join code", async () => {
    const headers = await teacher();
    const codes = new Set<string>();
    for (let i = 0; i < 5; i++)
      codes.add((await createClass(headers)).joinCode);
    expect(codes.size).toBe(5);
  });

  it.each([
    ["no name", { name: "   ", grades: [4] }],
    ["a name that's too long", { name: "x".repeat(61), grades: [4] }],
    ["no grades", { name: "Room 12", grades: [] }],
    ["a grade outside 3–5", { name: "Room 12", grades: [6] }],
  ])("refuses a class with %s", async (_, json) => {
    const headers = await teacher();
    const res = await client.classes.$post(
      { json: json as { name: string; grades: (3 | 4 | 5)[] } },
      { headers },
    );
    expect(res.status).toBe(400);
    expect(await classesOf(headers)).toEqual([]);
  });
});

describe("who can see a class", () => {
  it("shows a teacher only their own classes", async () => {
    const mine = await teacher();
    const theirs = await teacher();
    const myClass = await createClass(mine, { name: "Mine", grades: [3] });
    const theirClass = await createClass(theirs, {
      name: "Theirs",
      grades: [5],
    });

    expect(await classesOf(mine)).toEqual([myClass]);
    expect(await classesOf(theirs)).toEqual([theirClass]);
  });

  it("answers another teacher's class as if it didn't exist", async () => {
    const { id } = await createClass(await teacher());
    const res = await client.classes[":classId"].$get(
      { param: { classId: id } },
      { headers: await teacher() },
    );
    expect(res.status).toBe(404);

    const missing = await client.classes[":classId"].$get(
      { param: { classId: crypto.randomUUID() } },
      { headers: await teacher() },
    );
    expect(missing.status).toBe(404);
  });

  it("needs a signed-in browser", async () => {
    const { id } = await createClass(await teacher());
    expect((await client.classes.$get()).status).toBe(401);
    expect(
      (await client.classes.$post({ json: { name: "Room 12", grades: [4] } }))
        .status,
    ).toBe(401);
    expect(
      (await client.classes[":classId"].$get({ param: { classId: id } }))
        .status,
    ).toBe(401);
  });

  it("keeps students out", async () => {
    const { id } = await createClass(await teacher());
    const headers = await student();
    expect((await client.classes.$get(undefined, { headers })).status).toBe(
      403,
    );
    expect(
      (
        await client.classes.$post(
          { json: { name: "Room 12", grades: [4] } },
          { headers },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await client.classes[":classId"].$get(
          { param: { classId: id } },
          { headers },
        )
      ).status,
    ).toBe(403);
  });
});
