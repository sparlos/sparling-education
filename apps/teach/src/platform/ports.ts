// The teacher port: everything the teacher app needs from the rest of
// Kindling. The app only ever talks to these interfaces. They're implemented
// by the in-memory fake in ./fake/ and the API adapter in ./api/, and both
// must pass the suite in ./contract.ts.
import type { ComponentType } from "react";

/** Whoever is signed in on this browser, as the teacher app needs them. */
export interface Account {
  /** Stable and opaque; never an email or a name. */
  id: string;
  /** Fixed for good by where the account first signed in. Only teachers use this app. */
  role: "teacher" | "student";
  firstName: string;
  lastInitial: string;
}

/** Grades a class can have during the MVP. */
export const classGrades = [3, 4, 5] as const;
export type ClassGrade = (typeof classGrades)[number];

/** What a teacher gives to make a class. */
export interface NewClass {
  name: string;
  /** The class's grade, or grades for a split class. */
  grades: ClassGrade[];
}

/** One of the signed-in teacher's classes. */
export interface Class {
  /** Stable and opaque. */
  id: string;
  name: string;
  /** Ascending. */
  grades: ClassGrade[];
  joinCode: string;
  /** The class join link, as a full URL to share. */
  joinLink: string;
  /** Every game Kindling hosts, in the order teachers see them. */
  games: ClassGame[];
}

export interface ClassGame {
  /** The game's slug, e.g. "fraction-hop". */
  slug: string;
  name: string;
  /** Whether students in the class see it. Every game starts on. */
  on: boolean;
  /** The game link for this class, as a full URL to share. Carries the join code. */
  link: string;
}

export interface TeacherPort {
  /**
   * The signed-in account, or null when signed out. Rejects only when it
   * can't be checked (e.g. offline), so the app shows "try again" rather
   * than sign-in.
   */
  account(): Promise<Account | null>;
  /**
   * Signs in with the credential Google's sign-in button handed over. A new
   * Google account becomes a teacher; an existing one keeps its role. Rejects
   * with `CredentialRejected` when the credential isn't a valid sign-in.
   */
  signIn(credential: string): Promise<Account>;
  /** Signs this browser out. */
  signOut(): Promise<void>;
  /** The signed-in teacher's classes, oldest first. Rejects when no teacher is signed in. */
  classes(): Promise<Class[]>;
  /**
   * Makes a class for the signed-in teacher, with every game on. The name is
   * trimmed and the grades sorted. Rejects when no teacher is signed in, or
   * when the name is blank or longer than `classNameMaxLength`, or there are no grades.
   */
  createClass(draft: NewClass): Promise<Class>;
}

export const classNameMaxLength = 60;

export class CredentialRejected extends Error {
  constructor() {
    super("Google sign-in was rejected");
    this.name = "CredentialRejected";
  }
}

export interface SignInButtonProps {
  /** Called with Google's credential once the teacher has signed in with Google. */
  onCredential(credential: string): void;
}

export interface Platform {
  /** Shown in logs, e.g. "fake". */
  name: string;
  teacher: TeacherPort;
  /** Google's sign-in button, or the fake's stand-in for it. */
  SignInButton: ComponentType<SignInButtonProps>;
}
