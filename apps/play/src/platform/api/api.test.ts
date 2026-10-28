// @vitest-environment node
// The API adapters against the real API, in-process, over the test Postgres.
import { manifest as fractionHop } from "@games/fraction-hop/manifest";
import { setFetch } from "@repo/api-client";
import { defaultLook } from "@repo/avatar";
import { createTestDatabase } from "@repo/db/testing";
import { createApp, fakeGoogle } from "api/testing";
import { afterAll, beforeEach, describe, expect, inject, it } from "vitest";
import type { GameRegistry, HostedGame } from "../../games.ts";
import { boot } from "../../play/boot.ts";
import { lockerPortContract, sessionPortContract } from "../contract.ts";
import { NotAStudent, type Platform } from "../ports.ts";
import { standInRecords } from "../stand-ins/records.ts";
import { apiLinks } from "./links.ts";
import { apiLocker } from "./locker.ts";
import { apiMemberships } from "./memberships.ts";
import { apiSession } from "./session.ts";

const database = await createTestDatabase(inject("databaseUrl"));
beforeEach(() => database.reset());
afterAll(() => database.drop());

const google = fakeGoogle();
const app = createApp({ db: database.db, identity: google.verifier });

/** A browser of its own: requests go to the in-process API, with its cookies. */
function browser() {
  const cookies = new Map<string, string>();
  const send: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (cookies.size > 0)
      headers.set(
        "cookie",
        [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
      );
    const res = await app.request(String(input), { ...init, headers });
    for (const cookie of res.headers.getSetCookie()) {
      const [pair = ""] = cookie.split(";");
      const [name = "", value = ""] = pair.split("=");
      if (value === "" || /max-age=0/i.test(cookie)) cookies.delete(name);
      else cookies.set(name, value);
    }
    return res;
  };
  return {
    send,
    /** Signs in the way Google's redirect-mode button does. */
    async signInAsStudent() {
      cookies.set("g_csrf_token", "csrf");
      await send("/sign-in/student", {
        method: "POST",
        body: new URLSearchParams({
          credential: google.credentialFor(),
          g_csrf_token: "csrf",
        }),
      });
    },
    async signInAsTeacher() {
      await send("/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          credential: google.credentialFor(),
          as: "teacher",
        }),
      });
    },
  };
}

// One teacher's browser makes every class; setFetch switches the generated
// client between it and the student's browser.
async function asTeacher<T>(act: (send: typeof fetch) => Promise<T>) {
  const teacher = browser();
  await teacher.signInAsTeacher();
  return act(teacher.send);
}

sessionPortContract("API session", {
  signedOut: () => {
    setFetch(browser().send);
    return apiSession();
  },
  newStudent: async () => {
    const student = browser();
    await student.signInAsStudent();
    setFetch(student.send);
    return { session: apiSession(), memberships: apiMemberships() };
  },
  newClass: (name, grades) =>
    asTeacher(async (send) => {
      const res = await send("/classes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, grades }),
      });
      const { id, joinCode } = await res.json();
      return { classId: id, joinCode };
    }),
});

lockerPortContract("API locker", {
  newStudent: async () => {
    const student = browser();
    await student.signInAsStudent();
    setFetch(student.send);
    return { session: apiSession(), locker: apiLocker() };
  },
});

describe("API session", () => {
  it("rejects with NotAStudent when a teacher is signed in", async () => {
    const teacher = browser();
    await teacher.signInAsTeacher();
    setFetch(teacher.send);
    await expect(apiSession().current()).rejects.toBeInstanceOf(NotAStudent);
  });

  it("rejects when the API can't be reached, rather than saying signed out", async () => {
    setFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(apiSession().current()).rejects.toThrow();
  });

  it("rejects when the API fails", async () => {
    setFetch(async () => new Response("", { status: 503 }));
    await expect(apiSession().current()).rejects.toThrow();
  });
});

describe("a game link over the API", () => {
  // Only the manifest matters until the game renders.
  const games: GameRegistry = {
    [fractionHop.slug]: async () =>
      ({ manifest: fractionHop, Component: () => null }) as HostedGame,
  };

  async function newClass(grades: number[]) {
    const teacher = browser();
    await teacher.signInAsTeacher();
    const res = await teacher.send("/classes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Room 12", grades }),
    });
    return (await res.json()) as { id: string; joinCode: string };
  }

  /** A signed-in student with an avatar, opening a game link. */
  async function open(joinCode: string) {
    const student = browser();
    await student.signInAsStudent();
    setFetch(student.send);
    await apiLocker().wear(defaultLook);
    const records = standInRecords();
    const platform: Platform = {
      name: "api",
      session: apiSession(),
      memberships: apiMemberships(),
      locker: apiLocker(),
      records,
      links: apiLinks({ base: "/play/" }),
    };
    let n = 0;
    const result = await boot({
      url: new URL(
        `/play/${fractionHop.slug}?join=${joinCode}`,
        "https://k.test",
      ),
      base: "/play/",
      platform,
      games,
      storage: null,
      newId: () => `id-${++n}`,
      outboxTiming: { batchDelayMs: 0, retryDelaysMs: [60_000] },
    });
    return { result, platform, records };
  }

  it("joins a student to its class, and the play records that class", async () => {
    const { id, joinCode } = await newClass([4]);
    const { result, platform, records } = await open(joinCode);
    if (result.kind !== "ready") throw new Error(`Booted to ${result.kind}`);
    expect(result.ready.membership).toMatchObject({ classId: id, grade: 4 });
    expect((await platform.session.current())?.classes).toEqual([
      expect.objectContaining({ classId: id, grade: 4 }),
    ]);
    const exit = await result.ready.play.end("left", 1000);
    expect(records.stored).toEqual([
      expect.objectContaining({ kind: "end", class: id, game: "fraction-hop" }),
    ]);
    expect(exit).toBe(`/play/?play=${result.ready.play.id}`);
    for (const outbox of result.ready.outboxes) outbox.dispose();
  });

  it("asks for the grade first in a split class", async () => {
    const { id, joinCode } = await newClass([3, 4]);
    const { result } = await open(joinCode);
    expect(result).toMatchObject({
      kind: "pick-grade",
      membership: { classId: id, grade: null },
    });
  });

  it("says when its class has the game turned off", async () => {
    const { id, joinCode } = await newClass([4]);
    await database.db.class.update({
      where: { id },
      data: { gamesOff: [fractionHop.slug] },
    });
    expect((await open(joinCode)).result).toEqual({ kind: "game-off" });
  });

  it("says when no class has its join code", async () => {
    expect((await open("NOPE2345")).result).toEqual({ kind: "no-such-class" });
  });
});

describe("API links", () => {
  const links = apiLinks({ base: "/play/" });

  it("sends sign-in to the shell's Google sign-in page, carrying where to go after", () => {
    const url = new URL(links.signIn("/play/join/K7QM4XRT"), "https://k.test");
    expect(url.pathname).toBe("/play/sign-in");
    expect(url.searchParams.get("next")).toBe("/play/join/K7QM4XRT");
  });

  it("sends the student back to the locker, naming the play", () => {
    const url = new URL(links.locker("p1"), "https://k.test");
    expect(url.pathname).toBe("/play/");
    expect(url.searchParams.get("play")).toBe("p1");
  });
});
