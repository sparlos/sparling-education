import { testClient } from "hono/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { cookiesFrom, db, google, signInAsStudent } from "../test/client.ts";
import { type App, createApp } from "./app.ts";
import { timeUpHoldMs } from "./class-timer.ts";

type Headers = { cookie: string };

let now = new Date("2026-11-06T14:00:00Z");
const client: ReturnType<typeof testClient<App>> = testClient(
  createApp({ db, identity: google.verifier, clock: () => now }),
);
const timer = client.classes[":classId"].timer;

const minutes = (n: number) => n * 60_000;
const later = (ms: number) => {
  now = new Date(now.getTime() + ms);
};
const at = (ms: number) => new Date(now.getTime() + ms).toISOString();

beforeEach(() => {
  now = new Date("2026-11-06T14:00:00Z");
});

async function teacher() {
  const res = await client["sign-in"].$post({
    json: { credential: google.credentialFor(), as: "teacher" },
  });
  if (res.status !== 200) throw new Error(`Sign-in failed: ${res.status}`);
  return cookiesFrom(res);
}

async function classOf(headers: Headers) {
  const res = await client.classes.$post(
    { json: { name: "Room 12", grades: [4] } },
    { headers },
  );
  if (res.status !== 201) throw new Error(`Create failed: ${res.status}`);
  return res.json();
}

async function studentIn(...joinCodes: string[]) {
  const headers = await signInAsStudent();
  for (const joinCode of joinCodes)
    await client.memberships.$post({ json: { joinCode } }, { headers });
  return headers;
}

function start(headers: Headers, classId: string, n: number) {
  // Lengths not on offer are what's under test.
  return timer.$put(
    { param: { classId }, json: { minutes: n as 10 } },
    { headers },
  );
}

/** The class a teacher route answered with. */
async function classFrom(res: { status: number; json(): Promise<unknown> }) {
  if (res.status !== 200) throw new Error(`Class failed: ${res.status}`);
  return (await res.json()) as { timer: { endsAt: string } | null };
}

async function studentTimer(headers: Headers) {
  const res = await client.timer.$get({}, { headers });
  if (res.status !== 200) throw new Error(`Timer failed: ${res.status}`);
  return res.json();
}

describe("a class timer", () => {
  it("starts with none", async () => {
    const headers = await teacher();
    const made = await classOf(headers);
    expect(made.timer).toBeNull();
    expect(await studentTimer(await studentIn(made.joinCode))).toBeNull();
  });

  it("runs out the minutes the teacher picked from now, for the class and its students", async () => {
    const headers = await teacher();
    const made = await classOf(headers);
    const res = await start(headers, made.id, 20);
    expect(res.status).toBe(200);
    const started = await res.json();
    expect(started).toMatchObject({ timer: { endsAt: at(minutes(20)) } });
    const read = await client.classes[":classId"].$get(
      { param: { classId: made.id } },
      { headers },
    );
    expect(await read.json()).toEqual(started);
    expect(await studentTimer(await studentIn(made.joinCode))).toEqual({
      endsAt: at(minutes(20)),
    });
  });

  it("takes only the lengths on offer", async () => {
    const headers = await teacher();
    const made = await classOf(headers);
    expect((await start(headers, made.id, 7)).status).toBe(400);
    expect((await start(headers, made.id, 0)).status).toBe(400);
  });

  it("gets 5 more minutes while it's running, and not once it has run out", async () => {
    const headers = await teacher();
    const made = await classOf(headers);
    await start(headers, made.id, 10);
    const more = () =>
      timer.more.$post({ param: { classId: made.id } }, { headers });
    const res = await more();
    expect(res.status).toBe(200);
    expect((await classFrom(res)).timer).toEqual({ endsAt: at(minutes(15)) });
    later(minutes(15));
    expect((await more()).status).toBe(409);
  });

  it("can't get more minutes when there's none", async () => {
    const headers = await teacher();
    const made = await classOf(headers);
    const res = await timer.more.$post(
      { param: { classId: made.id } },
      { headers },
    );
    expect(res.status).toBe(409);
  });

  it("stops, for the class and its students", async () => {
    const headers = await teacher();
    const made = await classOf(headers);
    const student = await studentIn(made.joinCode);
    await start(headers, made.id, 10);
    const res = await timer.$delete(
      { param: { classId: made.id } },
      { headers },
    );
    expect(res.status).toBe(200);
    expect((await classFrom(res)).timer).toBeNull();
    expect(await studentTimer(student)).toBeNull();
  });

  it("stays for a while once it has run out, then is gone by itself", async () => {
    const headers = await teacher();
    const made = await classOf(headers);
    const student = await studentIn(made.joinCode);
    await start(headers, made.id, 10);
    const endsAt = at(minutes(10));
    later(minutes(10) + timeUpHoldMs - 1);
    expect(await studentTimer(student)).toEqual({ endsAt });
    later(1);
    expect(await studentTimer(student)).toBeNull();
    const read = await client.classes[":classId"].$get(
      { param: { classId: made.id } },
      { headers },
    );
    expect((await classFrom(read)).timer).toBeNull();
  });

  it("starting again replaces the one before", async () => {
    const headers = await teacher();
    const made = await classOf(headers);
    await start(headers, made.id, 45);
    const res = await start(headers, made.id, 10);
    expect((await classFrom(res)).timer).toEqual({ endsAt: at(minutes(10)) });
  });

  it("gives a student in two classes with timers the one that ends soonest", async () => {
    const first = await teacher();
    const second = await teacher();
    const a = await classOf(first);
    const b = await classOf(second);
    const student = await studentIn(a.joinCode, b.joinCode);
    await start(first, a.id, 30);
    await start(second, b.id, 15);
    expect(await studentTimer(student)).toEqual({ endsAt: at(minutes(15)) });
  });

  it("isn't for students outside the class", async () => {
    const headers = await teacher();
    const made = await classOf(headers);
    const other = await classOf(await teacher());
    await start(headers, made.id, 10);
    expect(await studentTimer(await studentIn(other.joinCode))).toBeNull();
    expect(await studentTimer(await studentIn())).toBeNull();
  });

  it("is only its teacher's to set", async () => {
    const made = await classOf(await teacher());
    const someoneElse = await teacher();
    expect((await start(someoneElse, made.id, 10)).status).toBe(404);
    const student = await studentIn(made.joinCode);
    expect((await start(student, made.id, 10)).status).toBe(403);
    const res = await timer.$delete(
      { param: { classId: made.id } },
      { headers: someoneElse },
    );
    expect(res.status).toBe(404);
  });

  it("is a student's to read, not a teacher's", async () => {
    const res = await client.timer.$get({}, { headers: await teacher() });
    expect(res.status).toBe(403);
    expect((await client.timer.$get({})).status).toBe(401);
  });
});
