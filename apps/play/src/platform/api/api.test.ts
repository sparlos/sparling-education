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
import {
  homePortContract,
  playRecordsPortContract,
  sampleAttempt,
  sampleEnd,
  sessionPortContract,
} from "../contract.ts";
import {
  type AttemptRecord,
  NotAStudent,
  type Platform,
  type PlayRecord,
} from "../ports.ts";
import { apiHome } from "./home.ts";
import { apiLinks } from "./links.ts";
import { apiMemberships } from "./memberships.ts";
import { apiRecords } from "./records.ts";
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
  newClass: (name, grades, colour) =>
    asTeacher(async (send) => {
      const res = await send("/classes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, grades, colour: colour ?? "teal" }),
      });
      const { id, joinCode } = await res.json();
      return { classId: id, joinCode };
    }),
});

homePortContract("API home", {
  newStudent: async () => {
    const student = browser();
    await student.signInAsStudent();
    setFetch(student.send);
    // Their teacher's class, made and joined the first time it's needed.
    let joined: Promise<{ classId: string; teacher: typeof fetch }> | null =
      null;
    const inClass = () => {
      joined ??= (async () => {
        const teacher = browser();
        await teacher.signInAsTeacher();
        const res = await teacher.send("/classes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Room 12", grades: [4] }),
        });
        const { joinCode } = (await res.json()) as { joinCode: string };
        setFetch(student.send);
        const { classId } = await apiMemberships().join(joinCode);
        return { classId, teacher: teacher.send };
      })();
      return joined;
    };
    return {
      session: apiSession(),
      home: apiHome(),
      earn: async () => {
        const { classId } = await inClass();
        const me = await apiSession().current();
        const common = {
          play: `earning-${crypto.randomUUID()}`,
          student: me?.id ?? "",
          class: classId,
          game: fractionHop.slug,
          gameVersion: fractionHop.version,
          tier: "g4",
        };
        // Three tasks each got wrong, then right, and the play finished.
        const refused = (status: number, error: unknown) => {
          throw new Error(`Refused (${status}): ${JSON.stringify(error)}`);
        };
        await apiRecords({ onRefused: refused }).send([
          ...["t1", "t2", "t3"].flatMap((task) =>
            [false, true].map((succeeded) =>
              sampleAttempt({
                ...common,
                task,
                expectation: "math-2020.g4.B1.6",
                succeeded,
              }),
            ),
          ),
          sampleEnd({ ...common }),
        ]);
      },
      recognise: async () => {
        const { classId, teacher } = await inClass();
        const me = await apiSession().current();
        const res = await teacher(
          `/classes/${classId}/students/${me?.id}/recognition`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ trait: "kindness" }),
          },
        );
        if (res.status !== 200) throw new Error(`Recognise: ${res.status}`);
      },
    };
  },
});

/** Everything stored for the student, as the shell sent it. */
async function storedFor(studentId: string): Promise<PlayRecord[]> {
  const rows = await database.db.playRecord.findMany({
    where: { studentId },
    orderBy: { sequence: "asc" },
  });
  return rows.map((row) => {
    const common = {
      id: row.id,
      play: row.play,
      student: row.studentId,
      class: row.classId,
      game: row.game,
      gameVersion: row.gameVersion,
      tier: row.tier,
      at: row.at.toISOString(),
    };
    if (row.kind === "end")
      return { ...common, kind: "end", ending: row.ending ?? "finished" };
    return {
      ...common,
      kind: "attempt",
      task: row.task ?? "",
      expectation: row.expectation as AttemptRecord["expectation"],
      succeeded: row.succeeded ?? false,
      ...(row.misconception !== null && { misconception: row.misconception }),
      ...(row.assisted !== null && { assisted: row.assisted }),
      ...(row.asked !== null && { asked: row.asked }),
      ...(row.detail !== null && { detail: row.detail }),
      ...(row.exploring && { exploring: true }),
    };
  });
}

/** A signed-in student in a Grade 4 class, sending records. */
async function playingStudent() {
  const { joinCode } = await asTeacher(async (send) => {
    const res = await send("/classes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Room 12", grades: [4] }),
    });
    return (await res.json()) as { joinCode: string };
  });
  const student = browser();
  await student.signInAsStudent();
  setFetch(student.send);
  const membership = await apiMemberships().join(joinCode);
  const self = await apiSession().current();
  if (!self) throw new Error("Not signed in");
  return {
    studentId: self.id,
    context: {
      student: self.id,
      class: membership.classId,
      game: fractionHop.slug,
      gameVersion: fractionHop.version,
      tier: "g4",
      expectation: "math-2020.g4.B1.6",
      misconception: "bigger-denominator-bigger",
    } as const,
  };
}

playRecordsPortContract("API play records", async () => {
  const { studentId, context } = await playingStudent();
  return {
    port: apiRecords(),
    stored: () => storedFor(studentId),
    context,
  };
});

describe("API play records", () => {
  it("drops a batch the API will never accept, rather than retrying it", async () => {
    const { studentId, context } = await playingStudent();
    const refused: number[] = [];
    const port = apiRecords({ onRefused: (status) => refused.push(status) });
    await port.send([sampleAttempt({ ...context, tier: "g9" })]);
    await port.send([sampleAttempt({ ...context, student: "someone-else" })]);
    expect(refused).toEqual([400, 403]);
    expect(await storedFor(studentId)).toEqual([]);
  });

  it("rejects when the API can't be reached, so the batch is retried", async () => {
    setFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(apiRecords().send([sampleAttempt()])).rejects.toThrow();
  });

  it.each([500, 503, 429])(
    "rejects when the API answers %i, so the batch is retried",
    async (status) => {
      setFetch(async () => new Response("Unavailable", { status }));
      await expect(apiRecords().send([sampleAttempt()])).rejects.toThrow();
    },
  );
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
    const made = (await res.json()) as { id: string; joinCode: string };
    return { ...made, teacher: teacher.send };
  }

  /** A signed-in student with an avatar, opening a game link. */
  async function open(joinCode: string) {
    const student = browser();
    await student.signInAsStudent();
    setFetch(student.send);
    await apiHome().wear(defaultLook);
    const records = apiRecords();
    const platform: Platform = {
      name: "api",
      session: apiSession(),
      memberships: apiMemberships(),
      home: apiHome(),
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
    return { result, platform };
  }

  it("joins a student to its class, and the play records that class", async () => {
    const { id, joinCode } = await newClass([4]);
    const { result, platform } = await open(joinCode);
    if (result.kind !== "ready") throw new Error(`Booted to ${result.kind}`);
    expect(result.ready.membership).toMatchObject({ classId: id, grade: 4 });
    expect((await platform.session.current())?.classes).toEqual([
      expect.objectContaining({ classId: id, grade: 4 }),
    ]);
    const exit = await result.ready.play.end("left", 1000);
    const student = await platform.session.current();
    if (!student) throw new Error("Not signed in");
    expect(await storedFor(student.id)).toEqual([
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

  it("says when its class has the game turned off, and opens it once it's back on", async () => {
    const { id, joinCode, teacher } = await newClass([4]);
    const turn = (on: boolean) =>
      teacher(`/classes/${id}/games/${fractionHop.slug}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ on }),
      });
    expect((await turn(false)).status).toBe(200);
    expect((await open(joinCode)).result).toEqual({ kind: "game-off" });
    expect((await turn(true)).status).toBe(200);
    expect((await open(joinCode)).result).toMatchObject({ kind: "ready" });
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

  it("sends the student back home, naming the play", () => {
    const url = new URL(links.home("p1"), "https://k.test");
    expect(url.pathname).toBe("/play/");
    expect(url.searchParams.get("play")).toBe("p1");
  });
});
