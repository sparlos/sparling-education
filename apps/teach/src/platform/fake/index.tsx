// FAKE platform: the teacher app without the API or Google. Its sign-in
// button signs straight in as one made-up Google account.
import { Button } from "@repo/ui/button";
import type { GoogleAccount } from "../contract.ts";
import type { Platform, SignInButtonProps } from "../ports.ts";
import { fakeTeacherBackend } from "./teacher.ts";

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
}

const newTeacher: GoogleAccount = {
  subject: "fake-teacher",
  firstName: "Ada",
  lastName: "Lovelace",
};

export function createFakePlatform(
  options: FakePlatformOptions = {},
): Platform {
  const { google = newTeacher } = options;
  const backend = fakeTeacherBackend({
    offline: options.offline,
    origin: options.origin,
  });
  if (options.student) backend.addStudent(google);
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
