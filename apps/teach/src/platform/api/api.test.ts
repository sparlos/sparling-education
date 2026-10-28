// @vitest-environment node
// The API adapter against the real API, in-process, over the test Postgres.
import { setFetch } from "@repo/api-client";
import { createTestDatabase } from "@repo/db/testing";
import { createApp, fakeGoogle } from "api/testing";
import { afterAll, beforeEach, inject } from "vitest";
import { teacherPortContract } from "../contract.ts";
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

teacherPortContract("API teacher port", () => {
  setFetch(browser());
  return {
    port: apiTeacherPort({ origin: "https://kindling.test" }),
    credentialFor: ({ subject, firstName, lastName }) =>
      google.credentialFor({
        sub: subject,
        given_name: firstName,
        family_name: lastName,
      }),
    // No endpoint makes a student yet; joining a class will.
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
  };
});
