// Import this from an API test file to get a client for the app, backed by a
// database of the file's own that is emptied before each test.

import { createTestDatabase } from "@repo/db/testing";
import { testClient } from "hono/testing";
import { afterAll, beforeEach, inject } from "vitest";
import { type App, createApp } from "../src/app.ts";
import { fakeGoogle } from "./fake-google.ts";

const database = await createTestDatabase(inject("databaseUrl"));

beforeEach(() => database.reset());
afterAll(() => database.drop());

export const { db } = database;
/** Google sign-in for this file's tests. */
export const google = fakeGoogle();
export const app = createApp({ db, identity: google.verifier });
export const client: ReturnType<typeof testClient<App>> = testClient(app);

/** The `cookie` header a browser would send back after `res`. */
export function cookiesFrom(res: Pick<Response, "headers">): {
  cookie: string;
} {
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return { cookie };
}

/**
 * Signs a new browser in as a student, the way Google's redirect-mode button
 * does on the play shell's sign-in page: the headers that act as them.
 */
export async function signInAsStudent(credential = google.credentialFor()) {
  const res = await postStudentSignIn(credential);
  if (res.headers.get("location") !== "/play/sign-in")
    throw new Error(`Student sign-in failed: ${res.headers.get("location")}`);
  return cookiesFrom(res);
}

/** Posts Google's sign-in form, with its double-submit cookie unless told otherwise. */
export function postStudentSignIn(
  credential: string,
  csrf: { field?: string; cookie?: string | null } = {},
): Promise<Pick<Response, "status" | "headers">> {
  const field = csrf.field ?? "csrf-from-google";
  const cookie = csrf.cookie === undefined ? field : csrf.cookie;
  return client["sign-in"].student.$post(
    { form: { credential, g_csrf_token: field } },
    { headers: cookie === null ? {} : { cookie: `g_csrf_token=${cookie}` } },
  );
}
