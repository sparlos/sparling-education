// The platform contract: everything the play shell needs from the rest of
// The platform (sign-in, the student's classes and grades, joining a class, their
// home and avatar, somewhere to send each play's attempts and how it ended, and links into
// other apps). The shell only ever talks to these interfaces. They're
// implemented by the stand-ins in ./stand-ins/ and the adapters over
// The platform's API in ./api/, and each one must pass the suites in
// ./contract.ts. See ./README.md.
import type { AvatarLook } from "@repo/avatar";
import type { ExpectationId } from "@repo/curriculum";
import type { Attempt, GameManifest, Locale } from "@repo/game-contract";
import type { ClassColourSlug } from "@repo/tokens";
import type { ComponentType } from "react";

export type { AvatarLook } from "@repo/avatar";

/** The signed-in student, as the shell needs them. */
export interface Student {
  /** Stable and opaque; never an email or a name. */
  id: string;
  locale: Locale;
  /**
   * Null until they design their avatar, which the shell has them do before
   * anything else.
   */
  look: AvatarLook | null;
  /** The classes they're in, in the order they joined. */
  classes: Membership[];
}

/** A student who has designed their avatar: everywhere past that first step. */
export type DressedStudent = Student & { look: AvatarLook };

/** A student in one class. */
export interface Membership {
  /** Stable and opaque. */
  classId: string;
  className: string;
  /**
   * The class's colour, which its section of home and the screens
   * around its games take. Never named to the student.
   */
  classColour: ClassColourSlug;
  /** The class's grades, ascending: several for a split class. */
  grades: number[];
  /**
   * Their grade in this class, 1–8, which chooses the tier of its games.
   * Null until a student in a split class picks one of its grades.
   */
  grade: number | null;
  /** The class's games that are on, in the order students see them. */
  games: HomeGame[];
}

export interface HomeGame {
  slug: string;
  /** The game's name, as students see and hear it. */
  name: string;
}

export interface SessionPort {
  /**
   * The signed-in student, or null when signed out. Rejects with
   * `NotAStudent` when a teacher is signed in, and otherwise only when the
   * session can't be checked (e.g. offline); the shell shows an error rather
   * than sending a signed-in student to sign-in.
   */
  current(): Promise<Student | null>;
}

export interface MembershipsPort {
  /**
   * Joins the signed-in student to the class with this join code, or finds
   * them already in it, keeping their grade. In a single-grade class the
   * grade is set; in a split class it's null until they pick one. Rejects
   * with `NoSuchClass` when no class has the code.
   */
  join(joinCode: string): Promise<Membership>;
  /**
   * Sets the student's grade in a split class, once, to one of the class's
   * grades. Rejects when it's already set or isn't one of them.
   */
  pickGrade(classId: string, grade: number): Promise<Membership>;
}

/** What the student has at home: their outfit, stickers and locker. */
export interface Home {
  /**
   * The outfit pieces they own, as item IDs from `@repo/avatar/parts`: the
   * base set every student starts with, and their rewards. Skin tones and
   * hair aren't owned; they're everyone's.
   */
  owned: string[];
  /**
   * The stickers they own, as sticker IDs from `@repo/rewards`: the ones
   * they earned, in the order granted, then a recognition sticker for each
   * trait a teacher recognised them for.
   */
  stickers: string[];
  /**
   * Rewards (outfit pieces or stickers) and recognition stickers they
   * haven't seen yet, in the order they were given: revealed the next time
   * they open home, until they've seen them.
   */
  unseen: string[];
  /**
   * Outfit pieces they were given and haven't seen in the wardrobe yet, in
   * the order they were given: new there until they open the piece's slot,
   * whether or not they've seen it revealed. Never a sticker.
   */
  newInWardrobe: string[];
  /**
   * The stickers they put on their locker, and where, the one underneath
   * first. A sticker they own that isn't here is in their tray.
   */
  placements: Placement[];
  /**
   * A keepsake in their locker for each game they've played, however it
   * went, as game slugs, in the order first played, so each keeps its place.
   */
  keepsakes: string[];
  /** Keepsakes they haven't seen yet: new until they open the locker's door. */
  newKeepsakes: string[];
}

/** The two places on the locker a sticker can go. */
export type Surface = "front" | "inside";

/** Where a sticker goes on the locker. */
export interface Spot {
  /** The front of the locker's door, or the inside of the door. */
  surface: Surface;
  /** Where its centre is, across the surface: 0 is the left edge, 1 the right. */
  x: number;
  /** Where its centre is, down the surface: 0 is the top edge, 1 the bottom. */
  y: number;
}

/** A sticker on the locker. */
export interface Placement extends Spot {
  /** A sticker ID from `@repo/rewards` that the student owns. */
  sticker: string;
  /**
   * How far it's turned, in degrees clockwise: a little either way, picked
   * when it was put on the locker, and kept when it's moved.
   */
  tilt: number;
}

/**
 * Whether the small locker on home glows: there's a new keepsake, or a
 * sticker the student owns that isn't on their locker yet.
 */
export function lockerGlows(home: Home): boolean {
  const placed = new Set(home.placements.map((p) => p.sticker));
  return (
    home.newKeepsakes.length > 0 || home.stickers.some((s) => !placed.has(s))
  );
}

export interface HomePort {
  /** What the signed-in student has at home. */
  current(): Promise<Home>;
  /**
   * Dresses the signed-in student's avatar in `look`, which the session then
   * returns: the first time when they design it, then from the wardrobe.
   * Rejects with `NotOwned` when an outfit piece in it isn't theirs.
   */
  wear(look: AvatarLook): Promise<AvatarLook>;
  /**
   * The student has seen these rewards (or recognition stickers) revealed,
   * so they're no longer new.
   */
  markSeen(rewards: readonly string[]): Promise<void>;
  /**
   * The student has opened the wardrobe slot holding these outfit pieces, so
   * they're no longer new there. Doesn't change what's new on home.
   */
  markSeenInWardrobe(items: readonly string[]): Promise<void>;
  /**
   * Puts one of the student's stickers on their locker at `spot`, on top of
   * the others, and resolves with where it is now. One already on the
   * locker moves there and keeps its tilt; one put on fresh gets a new tilt.
   * Only the signed-in student's own locker changes. Rejects with
   * `NotOwned` when the sticker isn't theirs.
   */
  place(sticker: string, spot: Spot): Promise<Placement>;
  /**
   * Takes one of the student's stickers off their locker, back to their
   * tray. One that isn't on it changes nothing.
   */
  takeOff(sticker: string): Promise<void>;
  /**
   * The student opened their locker's door and saw these keepsakes, so
   * they're no longer new.
   */
  markKeepsakesSeen(games: readonly string[]): Promise<void>;
}

/** A teacher is signed in; the play shell is for students. */
export class NotAStudent extends Error {
  constructor() {
    super("Signed in, but not as a student");
    this.name = "NotAStudent";
  }
}

/** No class has the join code. */
export class NoSuchClass extends Error {
  constructor() {
    super("No class has that join code");
    this.name = "NoSuchClass";
  }
}

/** The look has an outfit piece, or the sticker placed is one, the student doesn't own. */
export class NotOwned extends Error {
  constructor() {
    super("That has something the student doesn't own");
    this.name = "NotOwned";
  }
}

/** What every record of a play carries, whatever kind it is. */
interface PlayRecordBase {
  /** Unique per record, made by the shell. Sends are retried, so the backend must ignore an ID it already has. */
  id: string;
  /** Groups one play's records into its result. */
  play: string;
  /** Must match the signed-in student; the backend rejects a mismatch. */
  student: string;
  /** The class the play was opened for; its results go to that class. */
  class: string;
  /** The game's slug. */
  game: string;
  /** The manifest version the play ran under. */
  gameVersion: number;
  tier: string;
  /** ISO 8601, from the device clock. */
  at: string;
}

/** One attempt: the game's attempt plus everything the shell knows about the play. */
export interface AttemptRecord extends PlayRecordBase {
  kind: "attempt";
  task: string;
  /** Carries its curriculum edition, e.g. "math-2020.g4.B1.5". */
  expectation: ExpectationId;
  succeeded: boolean;
  misconception?: string;
  assisted?: Attempt<GameManifest>["assisted"];
  /** What the task asked, for teachers; see the game contract's `Attempt`. */
  asked?: string;
  /** What the student did on this try, for teachers. */
  detail?: string;
  /** A try that only explored: shown to teachers, never scored. */
  exploring?: boolean;
}

/**
 * How a play ended. At most one per play, always after its attempts. A play
 * with no end record was abandoned: the tab closed, or the device died.
 */
export interface PlayEndRecord extends PlayRecordBase {
  kind: "end";
  /**
   * "finished": the game reached its end. "left": the student chose to stop.
   * "crashed": the game broke, through no choice of the student's.
   * "timeUp": the class timer ran out partway, through no choice of theirs.
   */
  ending: PlayEnding;
}

export type PlayEnding = "finished" | "left" | "crashed" | "timeUp";

export type PlayRecord = AttemptRecord | PlayEndRecord;

export interface PlayRecordsPort {
  /**
   * Stores a batch of play records for the signed-in student, in order.
   * Resolves once they're stored. Rejects only when trying again later could
   * succeed (no connection, a timeout, a 5xx); the shell keeps the batch and
   * retries. Must be idempotent by record ID, since a batch can arrive twice
   * when a response is lost.
   */
  send(batch: readonly PlayRecord[]): Promise<void>;
  /**
   * Whether the signed-in student has played this game before: true once any
   * record of a play of theirs is stored, from any class, at any tier, however
   * it ended. Records can arrive late, so a play on another device may not
   * count yet. Rejects when it can't be checked.
   */
  played(game: string): Promise<boolean>;
}

/** A class timer a teacher set: how long the student has. */
export interface ClassTimer {
  /** When it runs out, as an ISO date-time. */
  endsAt: string;
}

export interface TimerPort {
  /**
   * The class timer the signed-in student is under: of their classes'
   * timers, the one that ends soonest. Once it runs out, it stays until its
   * teacher clears it or a while after (the student is shown "Time's up"
   * meanwhile), then it's null. Null when none of their classes has one.
   * Rejects when it can't be checked.
   */
  current(): Promise<ClassTimer | null>;
}

/** Where the shell sends the student in other apps. All URLs are absolute or root-relative. */
export interface LinksPort {
  /** Sign-in, returning to `returnTo` (the game link the student opened) afterwards. */
  signIn(returnTo: string): string;
  /**
   * Home, where every game returns the student, naming the play they're
   * back from so home can reveal the rewards it earned.
   */
  home(play: string): string;
}

export interface Platform {
  /** Shown in logs, e.g. "stand-in". */
  name: string;
  session: SessionPort;
  memberships: MembershipsPort;
  home: HomePort;
  records: PlayRecordsPort;
  links: LinksPort;
  /** Class timers. A site with no classes (the try site) has none. */
  timer?: TimerPort;
  /**
   * Google's sign-in button, for the shell's sign-in page, which
   * `links.signIn` leads to. Platforms with a sign-in page of their own (the
   * stand-ins) have none.
   */
  SignInButton?: ComponentType<SignInButtonProps>;
}

/** The parts of the platform a game needs, whichever site it's played on. */
export type GamePlatform = Pick<
  Platform,
  "session" | "memberships" | "records" | "links"
>;

export interface SignInButtonProps {
  /** Called when sign-in can't be offered (e.g. Google's script didn't load). */
  onUnavailable(): void;
}
