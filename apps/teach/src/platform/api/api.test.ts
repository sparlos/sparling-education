// @vitest-environment node
// The API adapter against the real API, in-process, over the test Postgres.
import { setFetch } from "@repo/api-client";
import { createTestDatabase } from "@repo/db/testing";
import { createApp, fakeGoogle } from "api/testing";
import { afterAll, beforeEach, inject } from "vitest";
import {
  dashboardContract,
  type GoogleAccount,
  managingContract,
  type TeacherPortHarness,
  teacherPortContract,
} from "../contract.ts";
import { apiTeacherPort } from "./teacher.ts";

const database = await createTestDatabase(inject("databaseUrl"));
beforeEach(() => database.reset());
afterAll(() => database.drop());

const { db } = database;
const google = fakeGoogle();
const app = createApp({ db, identity: google.verifier });

/** A browser of its own: requests go to the in-process API, with its cookies. */
function browser(): typeof fetch {
  const cookies = new Map<string, string>();
  return async (input, init) => {
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
}

// Fraction Hop's tier for each grade, as its manifest has them.
const tiers: Record<number, { tier: string; expectation: string }> = {
  3: { tier: "g3", expectation: "math-2020.g3.B2.8" },
  4: { tier: "g4", expectation: "math-2020.g4.B1.6" },
  5: { tier: "g5", expectation: "math-2020.g5.B1.3" },
};

function harness(): TeacherPortHarness {
  setFetch(browser());
  // Each student's own browser, by Google subject.
  const students = new Map<string, { send: typeof fetch; id: string }>();
  const credentialFor = ({ subject, firstName, lastName }: GoogleAccount) =>
    google.credentialFor({
      sub: subject,
      given_name: firstName,
      family_name: lastName,
    });

  return {
    port: apiTeacherPort({ origin: "https://kindling.test" }),
    credentialFor,
    // Seeded directly: the teacher port never makes students.
    addStudent: async ({ subject, firstName, lastName }) => {
      await db.account.create({
        data: {
          googleSubject: subject,
          role: "student",
          firstName,
          lastInitial: lastName.slice(0, 1),
        },
      });
    },
    async joinClass(account, joinCode, grade) {
      const send = browser();
      await send("/sign-in/student", {
        method: "POST",
        headers: { cookie: "g_csrf_token=csrf" },
        body: new URLSearchParams({
          credential: credentialFor(account),
          g_csrf_token: "csrf",
        }),
      });
      const joined = await json(send, "POST", "/memberships", { joinCode });
      if (grade !== undefined && joined.grade === null)
        await json(send, "PUT", `/memberships/${joined.classId}/grade`, {
          grade,
        });
      const { id } = await json(send, "GET", "/session");
      students.set(account.subject, { send, id });
    },
    async play(account, classId, grade, tasks, ending = "finished") {
      const student = students.get(account.subject);
      const tier = tiers[grade];
      if (!student || !tier) throw new Error("Nobody to play that");
      const play = crypto.randomUUID();
      const common = () => ({
        id: crypto.randomUUID(),
        play,
        student: student.id,
        class: classId,
        game: "fraction-hop",
        gameVersion: 1,
        tier: tier.tier,
        at: new Date().toISOString(),
      });
      await json(student.send, "POST", "/play-records", [
        ...tasks.flatMap((tries, i) =>
          tries.map((t) => ({
            ...common(),
            kind: "attempt",
            task: `t${i + 1}`,
            expectation: tier.expectation,
            ...t,
          })),
        ),
        { ...common(), kind: "end", ending },
      ]);
      return tier.expectation;
    },
  };
}

/** Sends a JSON request from a browser, failing on anything but a 2xx. */
async function json(
  send: typeof fetch,
  method: string,
  path: string,
  body?: unknown,
) {
  const res = await send(path, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path} answered ${res.status}`);
  return res.json();
}

teacherPortContract("API teacher port", harness);
dashboardContract("API teacher port", harness);
managingContract("API teacher port", harness);
