// FAKE platform: the teacher app without the API or Google. Its sign-in
// button signs straight in as one made-up Google account.
import { Button } from "@repo/ui/button";
import type { GoogleAccount } from "../contract.ts";
import type { NewClass, Platform, SignInButtonProps } from "../ports.ts";
import { type FakeStudentSeed, fakeTeacherBackend } from "./teacher.ts";

export interface FakePlatformOptions {
  /** Who the sign-in button signs in as. A new teacher by default. */
  google?: GoogleAccount;
  /** The account is already a student's. */
  student?: boolean;
  /** The sign-in button hands over a credential Kindling rejects. */
  rejectSignIn?: boolean;
  /** While true, every call fails, as it would offline. */
  offline?: () => boolean;
  /** The site links point at. */
  origin?: string;
  /** Classes the teacher already has, with students who've played. */
  classes?: { draft: NewClass; students: FakeStudentSeed[] }[];
  /** Classes another teacher has, made before the teacher's own. */
  otherTeachersClasses?: NewClass[];
  /** The time it is now, for which term it is. The real time by default. */
  now?: Date;
  /** Give the teacher a demo class at their first sign-in, as Kindling does. */
  demoClass?: boolean;
  /** The walkthroughs the teacher has already seen. None, as for a new teacher, by default. */
  walkthroughsSeen?: readonly string[];
}

const newTeacher: GoogleAccount = {
  subject: "fake-teacher",
  firstName: "Ada",
  lastName: "Lovelace",
};

const otherTeacher: GoogleAccount = {
  subject: "fake-other-teacher",
  firstName: "Grace",
  lastName: "Hopper",
};

export function createFakePlatform(
  options: FakePlatformOptions = {},
): Platform {
  const { google = newTeacher } = options;
  const backend = fakeTeacherBackend({
    offline: options.offline,
    origin: options.origin,
    now: options.now ? () => options.now ?? new Date() : undefined,
    demoClass: options.demoClass,
    walkthroughsSeen: options.walkthroughsSeen,
  });
  if (options.student) backend.addStudent(google);
  for (const draft of options.otherTeachersClasses ?? [])
    backend.seedClass(otherTeacher, draft, []);
  for (const { draft, students } of options.classes ?? [])
    backend.seedClass(google, draft, students);
  const credential = options.rejectSignIn
    ? "forged"
    : backend.credentialFor(google);

  return {
    name: "fake",
    teacher: backend.port,
    SignInButton: ({ onCredential }: SignInButtonProps) => (
      <Button variant="secondary" onClick={() => onCredential(credential)}>
        Sign in with Google
      </Button>
    ),
  };
}
