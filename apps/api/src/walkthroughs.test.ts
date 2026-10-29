import { describe, expect, it } from "vitest";
import {
  client,
  cookiesFrom,
  google,
  signInAsStudent,
} from "../test/client.ts";
import { walkthroughsMax } from "./walkthroughs.ts";

type Headers = { cookie: string };

async function signInAsTeacher(
  credential = google.credentialFor(),
): Promise<Headers> {
  const res = await client["sign-in"].$post({
    json: { credential, as: "teacher" },
  });
  if (res.status !== 200) throw new Error(`Sign-in failed: ${res.status}`);
  return cookiesFrom(res);
}

const seen = async (headers: Headers) => {
  const res = await client.walkthroughs.$get(undefined, { headers });
  if (res.status !== 200) throw new Error(`Answered ${res.status}`);
  return (await res.json()).seen;
};

const mark = (headers: Headers, walkthrough: string) =>
  client.walkthroughs[":walkthrough"].$put(
    { param: { walkthrough } },
    { headers },
  );

describe("walkthroughs", () => {
  it("start with none seen for a new teacher", async () => {
    expect(await seen(await signInAsTeacher())).toEqual([]);
  });

  it("are remembered for the teacher on every browser, once each", async () => {
    const credential = google.credentialFor({ sub: "teacher-1" });
    const here = await signInAsTeacher(credential);
    expect((await mark(here, "welcome")).status).toBe(204);
    expect((await mark(here, "welcome")).status).toBe(204);
    expect((await mark(here, "student-page")).status).toBe(204);

    const there = await signInAsTeacher(
      google.credentialFor({ sub: "teacher-1" }),
    );
    expect(await seen(there)).toEqual(["welcome", "student-page"]);
  });

  it("are each teacher's own", async () => {
    await mark(await signInAsTeacher(), "welcome");
    expect(await seen(await signInAsTeacher())).toEqual([]);
  });

  it("only take IDs that look like the app's", async () => {
    const headers = await signInAsTeacher();
    expect((await mark(headers, "Not An ID")).status).toBe(400);
    expect((await mark(headers, "x".repeat(65))).status).toBe(400);
    expect(await seen(headers)).toEqual([]);
  });

  it("stop growing at the most there could be", async () => {
    const headers = await signInAsTeacher();
    for (let i = 0; i < walkthroughsMax; i++)
      expect((await mark(headers, `w-${i}`)).status).toBe(204);
    expect((await mark(headers, "one-more")).status).toBe(400);
    // One already seen is still fine.
    expect((await mark(headers, "w-0")).status).toBe(204);
    expect(await seen(headers)).toHaveLength(walkthroughsMax);
  });

  it("are for teachers only", async () => {
    expect((await client.walkthroughs.$get()).status).toBe(401);
    expect((await mark({ cookie: "" }, "welcome")).status).toBe(401);
    const student = await signInAsStudent();
    expect(
      (await client.walkthroughs.$get(undefined, { headers: student })).status,
    ).toBe(403);
    expect((await mark(student, "welcome")).status).toBe(403);
  });
});
