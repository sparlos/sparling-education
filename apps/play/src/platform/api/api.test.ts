// @vitest-environment node
// The API adapters against the real API, in-process, over the test Postgres.
import { setFetch } from "@repo/api-client";
import { createTestDatabase } from "@repo/db/testing";
import { createApp, fakeGoogle } from "api/testing";
import { afterAll, beforeEach, describe, expect, inject, it } from "vitest";
import { sessionPortContract } from "../contract.ts";
import { NotAStudent } from "../ports.ts";
import { apiLinks } from "./links.ts";
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

describe("API links", () => {
  const links = apiLinks({ base: "/play/" });

  it("sends sign-in to the shell's Google sign-in page, carrying where to go after", () => {
    const url = new URL(links.signIn("/play/join/K7QM4XRT"), "https://k.test");
    expect(url.pathname).toBe("/play/sign-in");
    expect(url.searchParams.get("next")).toBe("/play/join/K7QM4XRT");
  });

  it("sends the student back to the locker, naming the play", () => {
    const url = new URL(
      links.hub({ portal: "north", play: "p1" }),
      "https://k.test",
    );
    expect(url.pathname).toBe("/play/");
    expect(url.searchParams.get("play")).toBe("p1");
  });
});
