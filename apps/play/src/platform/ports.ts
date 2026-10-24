// The platform contract: everything the play shell needs from the rest of
// Kindling (sign-in, the student's class and grade, somewhere to send each
// play's attempts and how it ended, and links into other apps). The shell
// only ever talks to these interfaces. Today they're implemented by the stand-ins in ./stand-ins/;
// the real implementations wrap the backend's generated API client. Each one
// must pass the suites in ./contract.ts. See ./README.md.
import type { AvatarLook } from "@repo/avatar";
import type { ExpectationId } from "@repo/curriculum";
import type { Attempt, GameManifest, Locale } from "@repo/game-contract";

export type { AvatarLook } from "@repo/avatar";

/** The signed-in student, as the shell needs them. */
export interface Student {
  /** Stable and opaque; never an email or a name. */
  id: string;
  /** The grade their teacher set, 1–8. Chooses the tier. */
  grade: number;
  locale: Locale;
  look: AvatarLook;
  /** Null for a student who isn't in a class yet; they get a game-complete screen instead of the hub. */
  classId: string | null;
}

export interface SessionPort {
  /**
   * The signed-in student, or null when signed out. Shares the class world's
   * session, so a student signed in there is signed in here. Rejects only
   * when the session can't be checked (e.g. offline); the shell shows an
   * error rather than sending a signed-in student to sign-in.
   */
  current(): Promise<Student | null>;
}

/** What every record of a play carries, whatever kind it is. */
interface PlayRecordBase {
  /** Unique per record, made by the shell. Sends are retried, so the backend must ignore an ID it already has. */
  id: string;
  /** Groups one play's records into its result. */
  play: string;
  /** Must match the signed-in student; the backend rejects a mismatch. */
  student: string;
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
   */
  ending: PlayEnding;
}

export type PlayEnding = "finished" | "left" | "crashed";

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
}

/** Where the shell sends the student in other apps. All URLs are absolute or root-relative. */
export interface LinksPort {
  /** Sign-in, returning to `returnTo` (the game link the student opened) afterwards. */
  signIn(returnTo: string): string;
  /**
   * The class world, putting the student in front of the portal they came
   * through. The class world reveals the rewards the play earned.
   */
  hub(arrival: { portal: string; play: string }): string;
}

export interface Platform {
  /** Shown in logs, e.g. "stand-in". */
  name: string;
  session: SessionPort;
  records: PlayRecordsPort;
  links: LinksPort;
}
