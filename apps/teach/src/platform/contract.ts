// Behaviour every teacher port must have, as a reusable test suite. It runs
// against the in-memory fake (fake/fake.test.ts) and the API adapter over
// the in-process API and the test Postgres (api/api.test.ts), so the fake
// can't drift from the API.
import { describe, expect, it } from "vitest";
import { type Class, CredentialRejected, type TeacherPort } from "./ports.ts";

/** A Google account, as Google's sign-in knows it. */
export interface GoogleAccount {
  subject: string;
  firstName: string;
  lastName: string;
}

export interface TeacherPortHarness {
  port: TeacherPort;
  /** A credential for the account, as Google's sign-in button would hand over. */
  credentialFor(account: GoogleAccount): string | Promise<string>;
  /** Makes the account a student's, as joining a class will. */
  addStudent(account: GoogleAccount): void | Promise<void>;
}

let sequence = 0;

function newGoogleAccount(): GoogleAccount {
  sequence += 1;
  return {
    subject: `google-${sequence}`,
    firstName: "Ada",
    lastName: "Lovelace",
  };
}

export function teacherPortContract(
  name: string,
  make: () => TeacherPortHarness | Promise<TeacherPortHarness>,
) {
  describe(`${name} meets the teacher port contract`, () => {
    it("has no account when signed out", async () => {
      const { port } = await make();
      expect(await port.account()).toBeNull();
    });

    it("makes a teacher of a new Google account, keeping only the first name and last initial", async () => {
      const { port, credentialFor } = await make();
      const account = await port.signIn(
        await credentialFor(newGoogleAccount()),
      );
      expect(account).toEqual({
        id: expect.any(String),
        role: "teacher",
        firstName: "Ada",
        lastInitial: "L",
      });
      expect(await port.account()).toEqual(account);
    });

    it("finds the same teacher when they sign in again", async () => {
      const { port, credentialFor } = await make();
      const google = newGoogleAccount();
      const first = await port.signIn(await credentialFor(google));
      await port.signOut();
      expect(await port.signIn(await credentialFor(google))).toEqual(first);
    });

    it("keeps a student a student", async () => {
      const { port, credentialFor, addStudent } = await make();
      const google = newGoogleAccount();
      await addStudent(google);
      const account = await port.signIn(await credentialFor(google));
      expect(account.role).toBe("student");
      expect(await port.account()).toEqual(account);
    });

    it("rejects a credential Google didn't issue, and stays signed out", async () => {
      const { port } = await make();
      await expect(port.signIn("forged")).rejects.toBeInstanceOf(
        CredentialRejected,
      );
      expect(await port.account()).toBeNull();
    });

    it("is signed out after signing out", async () => {
      const { port, credentialFor } = await make();
      await port.signIn(await credentialFor(newGoogleAccount()));
      await port.signOut();
      expect(await port.account()).toBeNull();
    });
  });

  describe(`${name}'s classes`, () => {
    async function signedInTeacher() {
      const harness = await make();
      await harness.port.signIn(
        await harness.credentialFor(newGoogleAccount()),
      );
      return harness;
    }

    it("has none for a new teacher", async () => {
      const { port } = await signedInTeacher();
      expect(await port.classes()).toEqual([]);
    });

    it("makes a class with every game on, and links that carry its join code", async () => {
      const { port } = await signedInTeacher();
      const made = await port.createClass({
        name: "  Room 12 ",
        grades: [5, 4],
      });
      expect(made).toMatchObject({
        id: expect.any(String),
        name: "Room 12",
        grades: [4, 5],
        joinCode: expect.stringMatching(/^[A-Z2-9]{8}$/),
      });
      expectLinks(made);
      expect(made.games.length).toBeGreaterThan(0);
      for (const game of made.games) expect(game.on).toBe(true);
      expect(await port.classes()).toEqual([made]);
    });

    it("lists classes oldest first, each with its own join code", async () => {
      const { port } = await signedInTeacher();
      const first = await port.createClass({ name: "Room 12", grades: [3] });
      const second = await port.createClass({ name: "Room 14", grades: [4] });
      expect(await port.classes()).toEqual([first, second]);
      expect(first.joinCode).not.toBe(second.joinCode);
    });

    it("shows a teacher only their own classes", async () => {
      const { port, credentialFor } = await signedInTeacher();
      const mine = await port.createClass({ name: "Mine", grades: [3] });
      await port.signOut();
      await port.signIn(await credentialFor(newGoogleAccount()));
      expect(await port.classes()).toEqual([]);
      const theirs = await port.createClass({ name: "Theirs", grades: [5] });
      expect(await port.classes()).toEqual([theirs]);
      expect(theirs.id).not.toBe(mine.id);
    });

    it("refuses a class with no name or no grades", async () => {
      const { port } = await signedInTeacher();
      await expect(
        port.createClass({ name: "  ", grades: [4] }),
      ).rejects.toThrow();
      await expect(
        port.createClass({ name: "Room 12", grades: [] }),
      ).rejects.toThrow();
      expect(await port.classes()).toEqual([]);
    });

    it("needs a teacher signed in", async () => {
      const { port, credentialFor, addStudent } = await make();
      await expect(port.classes()).rejects.toThrow();
      await expect(
        port.createClass({ name: "Room 12", grades: [4] }),
      ).rejects.toThrow();

      const google = newGoogleAccount();
      await addStudent(google);
      await port.signIn(await credentialFor(google));
      await expect(port.classes()).rejects.toThrow();
    });
  });
}

/** The class join link and every game link, in the form the play shell reads. */
function expectLinks({ joinCode, joinLink, games }: Class) {
  const join = new URL(joinLink);
  expect(join.pathname).toBe(`/play/join/${joinCode}`);
  for (const { slug, link } of games) {
    const game = new URL(link);
    expect(game.origin).toBe(join.origin);
    expect(game.pathname).toBe(`/play/${slug}`);
    expect(game.searchParams.get("join")).toBe(joinCode);
  }
}
