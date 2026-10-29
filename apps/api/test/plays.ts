// Helpers for tests that play: a teacher's class, students joining it, and
// play records as the play shell would send them, for Fraction Hop.

import { randomUUID } from "node:crypto";
import type { PlayRecord } from "../src/schemas.ts";
import { client, cookiesFrom, google, signInAsStudent } from "./client.ts";

type Headers = { cookie: string };

/** A new teacher's browser: the headers that act as them. */
export async function teacher(): Promise<Headers> {
  const res = await client["sign-in"].$post({
    json: { credential: google.credentialFor(), as: "teacher" },
  });
  if (res.status !== 200) throw new Error(`Sign-in failed: ${res.status}`);
  return cookiesFrom(res);
}

export async function createClass(
  headers: Headers,
  grades: (3 | 4 | 5)[] = [4],
) {
  const res = await client.classes.$post(
    { json: { name: "Room 12", grades } },
    { headers },
  );
  if (res.status !== 201) throw new Error(`Create failed: ${res.status}`);
  return res.json();
}

/** A new student, signed in as `name`, who joined the class (picking `grade` in a split class). */
export async function joinedStudent(
  { id, joinCode }: { id: string; joinCode: string },
  options: { name?: [string, string]; grade?: number } = {},
) {
  const [given_name, family_name] = options.name ?? ["Sam", "Rivera"];
  const headers = await signInAsStudent(
    google.credentialFor({ given_name, family_name }),
  );
  const joined = await client.memberships.$post(
    { json: { joinCode } },
    { headers },
  );
  if (joined.status !== 200) throw new Error(`Join failed: ${joined.status}`);
  if (options.grade !== undefined) {
    const picked = await client.memberships[":classId"].grade.$put(
      { param: { classId: id }, json: { grade: options.grade } },
      { headers },
    );
    if (picked.status !== 200)
      throw new Error(`Grade pick failed: ${picked.status}`);
  }
  const session = await client.session.$get(undefined, { headers });
  const student = await session.json();
  if (!student || "error" in student) throw new Error("No session");
  return { headers, studentId: student.id };
}

export function sendRecords(
  headers: Headers,
  batch: PlayRecord[],
): ReturnType<(typeof client)["play-records"]["$post"]> {
  return client["play-records"].$post({ json: batch }, { headers });
}

export const tiers = {
  3: { tier: "g3", expectation: "math-2020.g3.B2.8" },
  4: { tier: "g4", expectation: "math-2020.g4.B1.6" },
  5: { tier: "g5", expectation: "math-2020.g5.B1.3" },
} as const;

type Try = {
  succeeded: boolean;
  assisted?: "hint" | "demonstration" | "guided";
  misconception?: string;
};

/**
 * One play's records: each task's tries in order, then (unless `ending` is
 * null) how it ended. Tasks are named t1, t2… within the play.
 */
export function playOf(
  who: { studentId: string; classId: string },
  tasks: Try[][],
  options: {
    grade?: 3 | 4 | 5;
    ending?: "finished" | "left" | "crashed" | null;
    at?: Date;
    play?: string;
  } = {},
): PlayRecord[] {
  const { tier, expectation } = tiers[options.grade ?? 4];
  const play = options.play ?? randomUUID();
  let time = +(options.at ?? new Date("2026-10-20T14:00:00Z"));
  const common = () => {
    time += 1000;
    return {
      id: randomUUID(),
      play,
      student: who.studentId,
      class: who.classId,
      game: "fraction-hop",
      gameVersion: 1,
      tier,
      at: new Date(time).toISOString(),
    };
  };
  const records: PlayRecord[] = tasks.flatMap((tries, i) =>
    tries.map((t) => ({
      ...common(),
      kind: "attempt" as const,
      task: `t${i + 1}`,
      expectation,
      ...t,
    })),
  );
  const ending = options.ending === undefined ? "finished" : options.ending;
  if (ending) records.push({ ...common(), kind: "end", ending });
  return records;
}

/** Tasks each got right first time, with no help. */
export const right = (n: number): Try[][] =>
  Array.from({ length: n }, () => [{ succeeded: true }]);

/** Tasks each got wrong, never got right. */
export const wrong = (n: number): Try[][] =>
  Array.from({ length: n }, () => [{ succeeded: false }]);
