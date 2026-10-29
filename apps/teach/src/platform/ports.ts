// The teacher port: everything the teacher app needs from the rest of
// Kindling. The app only ever talks to these interfaces. They're implemented
// by the in-memory fake in ./fake/ and the API adapter in ./api/, and both
// must pass the suite in ./contract.ts.
import type { LearningSkill } from "@repo/curriculum";
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
  /**
   * The demo class every new teacher gets at their first sign-in: simulated
   * students, with results already in.
   */
  demo: boolean;
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

/** A student in one of the teacher's classes. */
export interface ClassStudent {
  /** Stable and opaque. */
  id: string;
  firstName: string;
  lastInitial: string;
  /** Their grade in the class; null until they pick one in a split class. */
  grade: number | null;
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
   * One of the signed-in teacher's classes. Rejects when no teacher is signed
   * in, and with `NotFound` when the class isn't theirs.
   */
  class(classId: string): Promise<Class>;
  /**
   * Turns one of the class's games on or off, resolving with the class.
   * Students see only the games that are on; a game link for one that's off
   * tells them so. Rejects when no teacher is signed in, and with `NotFound`
   * when the class isn't theirs or there's no such game.
   */
  switchGame(classId: string, slug: string, on: boolean): Promise<Class>;
  /**
   * The class's students, by first name then last initial. Rejects when no
   * teacher is signed in, and with `NotFound` when the class isn't theirs.
   */
  students(classId: string): Promise<ClassStudent[]>;
  /**
   * Sets a student's grade in the class to one of its grades, whether or not
   * they picked one. Their next plays are at its tier; results they already
   * have keep theirs. Rejects when no teacher is signed in or the grade isn't
   * one of the class's, and with `NotFound` when the class isn't theirs or
   * the student isn't in it.
   */
  setStudentGrade(
    classId: string,
    studentId: string,
    grade: ClassGrade,
  ): Promise<ClassStudent>;
  /**
   * Takes the student out of the class: it leaves their locker, and they and
   * their results leave every view of it. Rejects when no teacher is signed
   * in, and with `NotFound` when the class isn't theirs or the student isn't
   * in it.
   */
  removeStudent(classId: string, studentId: string): Promise<void>;
  /**
   * The class's dashboard: its students against the expectations its games
   * evidence. Rejects when no teacher is signed in, and with `NotFound` when
   * the class isn't theirs.
   */
  dashboard(classId: string): Promise<Dashboard>;
  /**
   * A student's page, opened from their dashboard row: their effort by
   * Learning Skill and their results. Rejects when no teacher is signed in,
   * and with `NotFound` when the class isn't theirs or the student isn't in it.
   */
  studentPage(classId: string, studentId: string): Promise<StudentPage>;
  /**
   * Recognises the student for a character trait, giving them its exclusive
   * sticker, revealed as new in their locker. Once per trait per term in a
   * class: again this term resolves with the recognition already given.
   * Rejects when no teacher is signed in or the trait isn't one of
   * `RecognitionSettings.traits`, and with `NotFound` when the class isn't
   * theirs or the student isn't in it.
   */
  recognise(
    classId: string,
    studentId: string,
    trait: string,
  ): Promise<Recognition>;
  /**
   * A dashboard cell, opened: the student's evidence for the expectation.
   * Rejects when no teacher is signed in, and with `NotFound` when the class
   * isn't theirs, the student isn't in it, or there's no such expectation.
   */
  evidence(
    classId: string,
    studentId: string,
    expectationId: string,
  ): Promise<Evidence>;
  /**
   * One of the student's plays for the class, attempt by attempt. Rejects
   * when no teacher is signed in, and with `NotFound` when the class isn't
   * theirs, the student isn't in it, or they have no such play.
   */
  play(classId: string, studentId: string, playId: string): Promise<Play>;
  /**
   * The class's quick assess, for writing report cards: each student's
   * evidence. Rejects when no teacher is signed in, and with `NotFound` when
   * the class isn't theirs.
   */
  quickAssess(classId: string): Promise<QuickAssess>;
  /**
   * One student's quick assess. Rejects when no teacher is signed in, and
   * with `NotFound` when the class isn't theirs or the student isn't in it.
   */
  studentQuickAssess(
    classId: string,
    studentId: string,
  ): Promise<QuickAssessStudent>;
  /**
   * Deletes the signed-in teacher's demo class, its students and everything
   * of theirs, in one step. It never comes back. Rejects when no teacher is
   * signed in, and with `NotFound` when they have no demo class.
   */
  deleteDemoClass(): Promise<void>;
  /**
   * Has this browser view the play shell as one of the demo class's
   * students: opening `link` shows their locker, and their plays count only
   * in the demo class. Rejects when no teacher is signed in, and with
   * `NotFound` when they have no demo class.
   */
  viewDemoAsStudent(): Promise<DemoView>;
  /**
   * The app's walkthroughs the signed-in teacher has finished or skipped, by
   * the app's own IDs, on any browser. Rejects when no teacher is signed in.
   */
  walkthroughsSeen(): Promise<string[]>;
  /**
   * Remembers that the signed-in teacher has finished or skipped the
   * walkthrough, so it doesn't start by itself again. Seen again, it stays
   * seen once. Rejects when no teacher is signed in.
   */
  markWalkthroughSeen(walkthrough: string): Promise<void>;
}

/** Viewing the play shell as a demo student. */
export interface DemoView {
  student: { id: string; firstName: string; lastInitial: string };
  /** The play shell, as a full URL: their locker. */
  link: string;
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
  recognition: RecognitionSettings;
}

/** What a teacher recognises students for, and when. */
export interface RecognitionSettings {
  /**
   * This term's first and last days, as ISO dates ("2026-09-01"). Between
   * terms, the term that ended last.
   */
  term: { start: string; end: string };
  /** The character traits a teacher can recognise, in the order to offer them. */
  traits: { trait: string; name: string }[];
}

/** A teacher recognising a student for a trait. */
export interface Recognition {
  /** One of `RecognitionSettings.traits`. */
  trait: string;
  /** When it was given, as an ISO date-time. */
  awardedAt: string;
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

/** A student's page, opened from their dashboard row. */
export interface StudentPage {
  student: {
    id: string;
    firstName: string;
    lastInitial: string;
    grade: number | null;
  };
  /**
   * Their effort evidence for each Learning Skill it's evidence of, in the
   * curriculum's order, from every play of theirs for the class but crashed
   * ones. Raw attempts and time spent never count.
   */
  effort: EffortSkill[];
  /** Their dashboard row's results, by grade then code; none for no evidence yet. */
  results: { expectation: DashboardExpectation; result: Result }[];
  /** Every recognition they were given in the class, newest first. */
  recognised: Recognition[];
  recognition: RecognitionSettings;
}

export interface EffortSkill {
  skill: LearningSkill;
  /** The Learning Skill's name, e.g. "Self-Regulation". */
  name: string;
  evidence: { kind: EffortKind; count: number }[];
}

/**
 * What counts as effort: a task failed and later succeeded at in the same
 * play (with help or without), and a finished play.
 */
export type EffortKind = "improvedAfterMistake" | "finishedPlays";

export interface QuickAssess {
  /** By first name, then last initial. */
  students: QuickAssessStudent[];
}

/**
 * One student's quick assess, laid out as a report card is written: what
 * their plays show for each expectation, next steps, then Learning Skills,
 * which report cards keep apart from achievement. Counts only, never a
 * level, rating or mark: the judgement is the teacher's.
 */
export interface QuickAssessStudent {
  student: {
    id: string;
    firstName: string;
    lastInitial: string;
    grade: number | null;
  };
  /** By grade, then code. None until they've played. */
  expectations: QuickAssessExpectation[];
  /**
   * The misconceptions they showed in their recent plays, as the dashboard's
   * strip counts them, by game name.
   */
  nextSteps: Misconception[];
  /** Their effort evidence by Learning Skill, as on their page. */
  learningSkills: EffortSkill[];
}

/** What a student's recent plays show for one expectation, at one tier. */
export interface QuickAssessExpectation {
  expectation: DashboardExpectation;
  tierGrade: number;
  /** A tier other than the student's grade in the class. */
  otherTier: boolean;
  /** Tasks at it in the plays its result counts, each once however many tries. */
  tasks: number;
  /** Of those, the ones done without help. */
  onTheirOwn: number;
  /** How many plays: their most recent at the tier. */
  plays: number;
  /** The games the plays were of. */
  games: { slug: string; name: string }[];
  /** When the first and last of the plays started, by the device's clock, as ISO date-times. */
  first: string;
  last: string;
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
  /** Every play with evidence for it, newest first. */
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
  /** Tries at those tasks, retries included; not explored ones. */
  tries: number;
  /** Tries that only explored, which are never scored. */
  explored: number;
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
    /**
     * What the task asked, as the game wrote it for teachers (fractions as
     * `a/b`), or null when the game didn't say.
     */
    asked: string | null;
    /** In order; every one after the first is a retry. */
    attempts: Attempt[];
  }[];
}

export interface Attempt {
  /** By the device's clock, as an ISO date-time. */
  at: string;
  succeeded: boolean;
  /** A try that only explored: neither right nor wrong, and never scored. */
  exploring: boolean;
  /** What the student did on it, as the game wrote it (fractions as `a/b`), if it said. */
  detail: string | null;
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
  /** Its official page on the DCP, where the ministry's wording is. */
  link: string;
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
  /** The traits they were recognised for in the class this term, in the order offered. */
  recognised: string[];
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

/** What was asked for isn't the signed-in teacher's to see: not theirs, gone, or made up. */
export class NotFound extends Error {
  constructor(what: string) {
    super(`No such ${what}`);
    this.name = "NotFound";
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
