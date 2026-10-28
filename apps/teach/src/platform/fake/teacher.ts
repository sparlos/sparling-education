// FAKE teacher port: Kindling's accounts, sessions and classes kept in memory. Used
// by the app's own tests, and by `VITE_TEACH_PLATFORM=fake` to run the app
// without the API. Must keep passing ../contract.ts, like the API adapter.
import type { GoogleAccount } from "../contract.ts";
import {
  type Account,
  type Class,
  CredentialRejected,
  classNameMaxLength,
  type TeacherPort,
} from "../ports.ts";

/** A game the fake hosts. */
export interface FakeGame {
  slug: string;
  name: string;
}

const fakeGames: readonly FakeGame[] = [
  { slug: "fraction-hop", name: "Fraction Hop" },
];

export interface FakeTeacherBackend {
  port: TeacherPort;
  credentialFor(google: GoogleAccount): string;
  addStudent(google: GoogleAccount): void;
}

export function fakeTeacherBackend(
  options: {
    /** While true, every call fails, as it would offline. */
    offline?: () => boolean;
    /** The site links point at. */
    origin?: string;
    games?: readonly FakeGame[];
  } = {},
): FakeTeacherBackend {
  const { origin = "https://kindling.test", games = fakeGames } = options;
  const issued = new Map<string, GoogleAccount>();
  const accounts = new Map<string, Account>(); // by Google subject
  const classes: { teacherId: string; class: Class }[] = [];
  let signedIn: Account | null = null;

  function reachable() {
    if (options.offline?.()) throw new Error("Can't reach Kindling (fake)");
  }

  function signedInTeacher() {
    if (signedIn?.role !== "teacher")
      throw new Error("No teacher is signed in (fake)");
    return signedIn;
  }

  function newJoinCode(): string {
    const alphabet = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
    const code = Array.from(
      { length: 8 },
      () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");
    return classes.some((c) => c.class.joinCode === code)
      ? newJoinCode()
      : code;
  }

  function accountFor(google: GoogleAccount, role: Account["role"]) {
    const existing = accounts.get(google.subject);
    const account: Account = {
      id: existing?.id ?? `account-${accounts.size + 1}`,
      role: existing?.role ?? role,
      firstName: google.firstName,
      lastInitial: google.lastName.slice(0, 1).toLocaleUpperCase("en-CA"),
    };
    accounts.set(google.subject, account);
    return account;
  }

  return {
    port: {
      async account() {
        reachable();
        return signedIn;
      },
      async signIn(credential) {
        reachable();
        const google = issued.get(credential);
        if (!google) throw new CredentialRejected();
        signedIn = accountFor(google, "teacher");
        return signedIn;
      },
      async signOut() {
        reachable();
        signedIn = null;
      },
      async classes() {
        reachable();
        const { id } = signedInTeacher();
        return classes.filter((c) => c.teacherId === id).map((c) => c.class);
      },
      async createClass(draft) {
        reachable();
        const { id } = signedInTeacher();
        const name = draft.name.trim();
        if (!name || name.length > classNameMaxLength)
          throw new Error("A class needs a name (fake)");
        if (draft.grades.length === 0)
          throw new Error("A class needs a grade (fake)");
        const joinCode = newJoinCode();
        const made: Class = {
          id: `class-${classes.length + 1}`,
          name,
          grades: [...new Set(draft.grades)].sort((a, b) => a - b),
          joinCode,
          joinLink: `${origin}/play/join/${joinCode}`,
          games: games.map(({ slug, name }) => ({
            slug,
            name,
            on: true,
            link: `${origin}/play/${slug}?join=${joinCode}`,
          })),
        };
        classes.push({ teacherId: id, class: made });
        return made;
      },
    },
    credentialFor(google) {
      const credential = `fake-google-${issued.size + 1}`;
      issued.set(credential, google);
      return credential;
    },
    addStudent(google) {
      accountFor(google, "student");
    },
  };
}
