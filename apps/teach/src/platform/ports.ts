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
  /**
   * The class's dashboard: its students against the expectations its games
   * evidence. Rejects when no teacher is signed in, or the class isn't theirs.
   */
  dashboard(classId: string): Promise<Dashboard>;
  /**
   * A dashboard cell, opened: the student's evidence for the expectation.
   * Rejects when no teacher is signed in, the class isn't theirs, the
   * student isn't in it, or there's no such expectation.
   */
  evidence(
    classId: string,
    studentId: string,
    expectationId: string,
  ): Promise<Evidence>;
  /**
   * One of the student's plays for the class, attempt by attempt. Rejects
   * when no teacher is signed in, the class isn't theirs, the student isn't
   * in it, or they have no such play.
   */
  play(classId: string, studentId: string, playId: string): Promise<Play>;
}

/**
 * How well a student's plays show understanding of an expectation. A
 * description of the evidence, never a mark or an achievement level; an
 * expectation with no result has no evidence yet.
 */
export type Understanding =
  | "not-yet-showing"
  | "developing"
  | "showing-consistently";

export interface Dashboard {
  /** What the class's games evidence at its grades, by grade then code. */
  expectations: DashboardExpectation[];
  /** By first name, then last initial. */
  students: DashboardStudent[];
  /**
   * The misconceptions revealed in the students' recent plays, the one most
   * students showed first.
   */
  misconceptions: ClassMisconception[];
}

/** A wrong idea a game's attempts can reveal. */
export interface Misconception {
  /** The game's slug. */
  game: string;
  gameName: string;
  /** The game's own name for it, e.g. "bigger-denominator-bigger". */
  id: string;
  /** The wrong idea in a sentence, in the game's words. */
  description: string;
}

export interface ClassMisconception extends Misconception {
  /** Who showed it, by first name then last initial. */
  students: {
    id: string;
    firstName: string;
    lastInitial: string;
    /** The expectation whose evidence shows it: where they last showed it. */
    expectation: string;
  }[];
}

/** A student's evidence for one expectation: a dashboard cell, opened. */
export interface Evidence {
  student: {
    id: string;
    firstName: string;
    lastInitial: string;
    grade: number | null;
  };
  expectation: DashboardExpectation;
  /** Their understanding at each tier they have evidence from, their own grade's first. */
  results: Result[];
  /** Every play with evidence for it, oldest first. */
  plays: EvidencePlay[];
}

/** How a play ended; null while it's going, or until its end arrives. */
export type Ending = "finished" | "left" | "crashed" | null;

/** What every view of a play shows about it. */
export interface PlaySummary {
  /** The play's ID. */
  play: string;
  /** The game's slug. */
  game: string;
  gameName: string;
  tier: string;
  tierGrade: number;
  /** The game's version. */
  version: number;
  /** When it started, by the device's clock, as an ISO date-time. */
  at: string;
  ending: Ending;
}

/** A play, as evidence for one expectation: how its tasks at it went. */
export interface EvidencePlay extends PlaySummary {
  /** Tasks at this expectation, each counted once however many tries. */
  tasks: number;
  onTheirOwn: number;
  /** Succeeded at only with help. */
  withHelp: number;
  /** Never succeeded at. */
  notYet: number;
  /** Revealed in the play, in the order first revealed. */
  misconceptions: Misconception[];
  /** Whether the result counts it: only recent plays do, and never a crashed one. */
  counts: boolean;
}

export interface Play extends PlaySummary {
  student: { id: string; firstName: string; lastInitial: string };
  /** In the order each was first tried. */
  tasks: {
    task: string;
    expectation: string;
    /** In order; every one after the first is a retry. */
    attempts: Attempt[];
  }[];
}

export interface Attempt {
  /** By the device's clock, as an ISO date-time. */
  at: string;
  succeeded: boolean;
  /** The help the game gave before it, if any. */
  assisted: "hint" | "demonstration" | "guided" | null;
  misconception: Misconception | null;
}

export interface DashboardExpectation {
  /** With its curriculum edition, e.g. "math-2020.g4.B1.6". */
  id: string;
  grade: number;
  /** The curriculum's code, e.g. "B1.6". */
  code: string;
  /** Kindling's own words, from the curriculum package; never the ministry's. */
  description: string;
}

export interface DashboardStudent {
  /** Stable and opaque. */
  id: string;
  firstName: string;
  lastInitial: string;
  /** Their grade in the class; null until they pick one in a split class. */
  grade: number | null;
  /** One per expectation they have evidence for. */
  results: Result[];
}

/** A student's understanding of one expectation. */
export interface Result {
  expectation: string;
  understanding: Understanding;
  /** The grade of the tier it was earned at. */
  tierGrade: number;
  /** Earned at a tier other than the student's grade, and marked as such. */
  otherTier: boolean;
  /** The games, tiers and game versions it came from. */
  games: { slug: string; tier: string; version: number }[];
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
