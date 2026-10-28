import { describe, expect, it, vi } from "vitest";
import { client, cookiesFrom, db, google } from "../test/client.ts";

async function signIn(json: { credential: string; returnTo?: string }) {
  const res = await client["sign-in"].$post({
    json: { ...json, as: "teacher" },
  });
  if (res.status !== 200) throw new Error(`Sign-in failed: ${res.status}`);
  return { res, body: await res.json(), headers: cookiesFrom(res) };
}

function signInAsTeacher(credential = google.credentialFor()) {
  return signIn({ credential });
}

async function accountWith(headers?: { cookie: string }) {
  const res = await client.account.$get(undefined, { headers });
  expect(res.status).toBe(200);
  return res.json();
}

// No endpoint makes a student yet (joining a class does, in a later ticket).
async function existingStudent(sub: string) {
  await db.account.create({
    data: {
      googleSubject: sub,
      role: "student",
      firstName: "Maya",
      lastInitial: "R",
    },
  });
}

describe("signing in", () => {
  it("is signed out without a session", async () => {
    expect(await accountWith()).toBeNull();
    expect(
      await accountWith({ cookie: "kindling_session=made-up" }),
    ).toBeNull();
  });

  it("makes a teacher of a new Google account signing in through the teacher app", async () => {
    const credential = google.credentialFor({
      given_name: "Ada",
      family_name: "lovelace",
    });
    const { body, headers } = await signInAsTeacher(credential);
    expect(body).toEqual({
      account: {
        id: expect.any(String),
        role: "teacher",
        firstName: "Ada",
        lastInitial: "L",
      },
      returnTo: "/teach/",
    });
    expect(await accountWith(headers)).toEqual(body.account);
  });

  it("holds the session in an HTTP-only, same-site cookie for the whole domain", async () => {
    const { res } = await signInAsTeacher();
    const [cookie] = res.headers.getSetCookie();
    expect(cookie).toMatch(/^kindling_session=[^;]+/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("Path=/");
    expect(cookie).not.toContain("Domain=");
  });

  it("finds the same teacher again, with their latest names", async () => {
    const first = await signInAsTeacher(google.credentialFor({ sub: "g-1" }));
    const again = await signInAsTeacher(
      google.credentialFor({
        sub: "g-1",
        given_name: "Augusta",
        family_name: "King",
      }),
    );
    expect(again.body.account).toEqual({
      ...first.body.account,
      firstName: "Augusta",
      lastInitial: "K",
    });
  });

  it("rejects a credential Google didn't issue, without starting a session", async () => {
    const res = await client["sign-in"].$post({
      json: { credential: "forged", as: "teacher" },
    });
    expect(res.status).toBe(401);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("keeps a student a student when they sign in through the teacher app", async () => {
    await existingStudent("g-student");
    const { body, headers } = await signInAsTeacher(
      google.credentialFor({ sub: "g-student" }),
    );
    expect(body.account.role).toBe("student");
    expect(await accountWith(headers)).toMatchObject({ role: "student" });
  });

  it("is signed out once the session has expired", async () => {
    const { headers } = await signInAsTeacher();
    await db.session.updateMany({
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    expect(await accountWith(headers)).toBeNull();
  });
});

describe("returning after sign-in", () => {
  it("returns to a path on this domain", async () => {
    const { body } = await signIn({
      credential: google.credentialFor(),
      returnTo: "/teach/classes?x=1#top",
    });
    expect(body.returnTo).toBe("/teach/classes?x=1#top");
  });

  it.each([
    "https://evil.example/teach/",
    "//evil.example/teach/",
    "/\\evil.example/teach/",
    "/\t/evil.example/",
    "/.//evil.example/",
    "javascript:alert(1)",
    "teach/",
  ])("never leaves the domain, for %j", async (returnTo) => {
    const { body } = await signIn({
      credential: google.credentialFor(),
      returnTo,
    });
    expect(body.returnTo).toBe("/teach/");
  });
});

describe("signing out", () => {
  it("ends the session and clears its cookie", async () => {
    const { headers } = await signInAsTeacher();
    const res = await client["sign-out"].$post(undefined, { headers });
    expect(res.status).toBe(204);
    expect(res.headers.getSetCookie()[0]).toMatch(
      /^kindling_session=;.*Max-Age=0/,
    );
    // Even a browser that kept the cookie is signed out.
    expect(await accountWith(headers)).toBeNull();
  });

  it("leaves the teacher signed in on their other devices", async () => {
    const credential = () => google.credentialFor({ sub: "g-2" });
    const laptop = await signInAsTeacher(credential());
    const phone = await signInAsTeacher(credential());
    await client["sign-out"].$post(undefined, { headers: laptop.headers });
    expect(await accountWith(phone.headers)).toMatchObject({ role: "teacher" });
  });

  it("works when already signed out", async () => {
    const res = await client["sign-out"].$post();
    expect(res.status).toBe(204);
  });
});

describe("privacy", () => {
  it("never stores or logs the email, full surname or photo", async () => {
    const log = vi.fn();
    for (const level of ["log", "info", "warn", "error", "debug"] as const)
      vi.spyOn(console, level).mockImplementation(log);

    const credential = google.credentialFor({
      sub: "g-private",
      given_name: "Ada",
      family_name: "Lovelace",
      name: "Ada Lovelace",
      email: "ada.lovelace@school.example",
      picture: "https://photos.example/ada.jpg",
    });
    const { headers } = await signInAsTeacher(credential);
    await accountWith(headers);
    await client["sign-out"].$post(undefined, { headers });
    await client["sign-in"].$post({
      json: { credential: "forged", as: "teacher" },
    });

    const stored = JSON.stringify(await everyRow());
    expect(stored).toContain("g-private");
    for (const kept of [stored, JSON.stringify(log.mock.calls)]) {
      expect(kept).not.toContain("ada.lovelace");
      expect(kept).not.toContain("Lovelace");
      expect(kept).not.toContain("photos.example");
    }
  });
});

// Every row of every table, whatever the schema holds now or later.
async function everyRow() {
  const tables = await db.$queryRaw<{ name: string }[]>`
    SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public'`;
  const rows: unknown[] = [];
  for (const { name } of tables)
    rows.push(
      ...(await db.$queryRawUnsafe<unknown[]>(`SELECT * FROM "${name}"`)),
    );
  return rows;
}
