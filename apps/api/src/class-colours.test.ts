import { classColours, newClassColourOrder } from "@repo/tokens";
import { describe, expect, it } from "vitest";
import {
  client,
  cookiesFrom,
  db,
  google,
  signInAsStudent,
} from "../test/client.ts";

type Headers = { cookie: string };

async function teacher() {
  const res = await client["sign-in"].$post({
    json: { credential: google.credentialFor(), as: "teacher" },
  });
  if (res.status !== 200) throw new Error(`Sign-in failed: ${res.status}`);
  return cookiesFrom(res);
}

function create(headers: Headers, colour?: string) {
  return client.classes.$post(
    {
      // Unknown slugs are what's under test.
      json: { name: "Room 12", grades: [4], colour } as never,
    },
    { headers },
  );
}

async function created(headers: Headers, colour?: string) {
  const res = await create(headers, colour);
  if (res.status !== 201) throw new Error(`Create failed: ${res.status}`);
  return res.json();
}

function setColour(headers: Headers, classId: string, colour: string) {
  return client.classes[":classId"].colour.$put(
    { param: { classId }, json: { colour } as never },
    { headers },
  );
}

// In the order new classes get them, from the default on.
const slugs = newClassColourOrder.map((c) => c.slug);

describe("a class's colour", () => {
  it("is the one the teacher picked", async () => {
    const made = await created(await teacher(), "amber");
    expect(made.colour).toBe("amber");
  });

  it("is, by default, the first one the teacher's other classes haven't got", async () => {
    const headers = await teacher();
    await created(headers, slugs[0]);
    await created(headers, slugs[2]);
    expect((await created(headers)).colour).toBe(slugs[1]);
    expect((await created(headers)).colour).toBe(slugs[3]);
  });

  it("cycles through the colours once all are used", async () => {
    const headers = await teacher();
    for (const slug of slugs) await created(headers, slug);
    expect((await created(headers)).colour).toBe(slugs[0]);
    expect((await created(headers)).colour).toBe(slugs[1]);
  });

  it("doesn't count another teacher's classes", async () => {
    await created(await teacher(), slugs[0]);
    expect((await created(await teacher())).colour).toBe(slugs[0]);
  });

  it("refuses a colour that isn't one of the set", async () => {
    const headers = await teacher();
    expect((await create(headers, "chartreuse")).status).toBe(400);
    const made = await created(headers);
    expect((await setColour(headers, made.id, "chartreuse")).status).toBe(400);
  });

  it("changes, and every read of the class shows the new one", async () => {
    const headers = await teacher();
    const made = await created(headers);
    const res = await setColour(headers, made.id, "violet");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: made.id, colour: "violet" });
    const one = await client.classes[":classId"].$get(
      { param: { classId: made.id } },
      { headers },
    );
    expect(await one.json()).toMatchObject({ colour: "violet" });
    const all = await client.classes.$get(undefined, { headers });
    expect(await all.json()).toMatchObject([{ colour: "violet" }]);
  });

  it("can be changed only by the class's own teacher", async () => {
    const made = await created(await teacher(), "teal");
    const other = await teacher();
    expect((await setColour(other, made.id, "rose")).status).toBe(404);
    const student = await signInAsStudent();
    expect((await setColour(student, made.id, "rose")).status).toBe(403);
    expect(
      (
        await client.classes[":classId"].colour.$put({
          param: { classId: made.id },
          json: { colour: "rose" },
        })
      ).status,
    ).toBe(401);
  });

  it("is teal for a class stored before there were class colours", async () => {
    const headers = await teacher();
    const made = await created(headers, "violet");
    // As the migration left existing rows: the column's default.
    await db.$executeRaw`UPDATE "Class" SET "colour" = DEFAULT WHERE "id" = ${made.id}::uuid`;
    const res = await client.classes[":classId"].$get(
      { param: { classId: made.id } },
      { headers },
    );
    expect(await res.json()).toMatchObject({ colour: "teal" });
  });

  it("goes with the class into its students' lockers", async () => {
    const headers = await teacher();
    const made = await created(headers, "sky");
    const student = await signInAsStudent();
    const join = await client.memberships.$post(
      { json: { joinCode: made.joinCode } },
      { headers: student },
    );
    expect(await join.json()).toMatchObject({ classColour: "sky" });
    await setColour(headers, made.id, "coral");
    const session = await client.session.$get(undefined, { headers: student });
    expect(await session.json()).toMatchObject({
      classes: [{ classId: made.id, classColour: "coral" }],
    });
  });
});
