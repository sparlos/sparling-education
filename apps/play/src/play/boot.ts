// Turns the URL a student opened into a play that's ready to start, or says
// why it can't start.
import type { GameRegistry, HostedGame } from "../games.ts";
import {
  type DressedStudent,
  type Membership,
  NoSuchClass,
  type Platform,
  type Student,
} from "../platform/ports.ts";
import {
  createOutbox,
  type Outbox,
  type OutboxOptions,
  outboxKey,
  sendLeftovers,
} from "./outbox.ts";
import { createPlay, type Play } from "./play.ts";
import { type GameLink, parseGameLink, returnPath } from "./routes.ts";
import type { KeyValueStore } from "./storage.ts";
import { chooseTier } from "./tier.ts";

export interface ReadyPlay {
  link: GameLink;
  student: DressedStudent;
  /** The class the play is for, with the student's grade in it. */
  membership: Membership & { grade: number };
  game: HostedGame;
  tier: string;
  play: Play;
  /**
   * Whether this is the student's first play of the game, as far as the
   * shell knows yet. Asked for while the game loads, but never waited for:
   * true until the platform answers that they've played it before.
   */
  firstPlay(): boolean;
  /** This play's outbox and those of earlier plays still sending; dispose them all when done. */
  outboxes: Outbox[];
}

export type Boot =
  | { kind: "sign-in"; url: string }
  /** They have no avatar yet, and design it before anything else. */
  | { kind: "design"; student: Student }
  /** The game link joined them to a split class, and they pick their grade in it first. */
  | { kind: "pick-grade"; student: DressedStudent; membership: Membership }
  /** No class has the game link's join code. */
  | { kind: "no-such-class" }
  /** The game link's class has the game turned off. */
  | { kind: "game-off" }
  /** No class of theirs can play it yet; home shows why. */
  | { kind: "home" }
  | { kind: "not-found" }
  | { kind: "ready"; ready: ReadyPlay };

/**
 * Rejects when the session can't be checked (with `NotAStudent` for a
 * teacher), the class can't be joined, or the game can't be loaded.
 */
export async function boot(options: {
  url: URL;
  base: string;
  platform: Platform;
  games: GameRegistry;
  storage: KeyValueStore | null;
  newId: () => string;
  /** Batching and retry timings, for tests. */
  outboxTiming?: Pick<OutboxOptions, "batchDelayMs" | "retryDelaysMs">;
}): Promise<Boot> {
  const { platform, storage, newId } = options;
  const link = parseGameLink(options.url, options.base);
  const load =
    link && Object.hasOwn(options.games, link.slug)
      ? options.games[link.slug]
      : undefined;
  if (!link || !load) return { kind: "not-found" };

  const student = await platform.session.current();
  if (!student)
    return {
      kind: "sign-in",
      url: platform.links.signIn(returnPath(options.url)),
    };

  if (!student.look) return { kind: "design", student };
  const dressed: DressedStudent = { ...student, look: student.look };

  let membership: (Membership & { grade: number }) | undefined;
  if (link.joinCode) {
    // A teacher's game link: join its class, or find them already in it.
    const joined = await join(platform, link.joinCode);
    if (!joined) return { kind: "no-such-class" };
    if (joined.grade === null)
      return { kind: "pick-grade", student: dressed, membership: joined };
    if (!joined.games.some((g) => g.slug === link.slug))
      return { kind: "game-off" };
    membership = { ...joined, grade: joined.grade };
  } else {
    membership = membershipFor(student, link);
    if (!membership) return { kind: "home" };
  }

  // In development, ?tutorial=true plays it as a first play every time, so
  // a game's tutorial can be tried again and again.
  const tutorial =
    import.meta.env.DEV && options.url.searchParams.get("tutorial") === "true";
  let played = false;
  platform.records.played(link.slug).then(
    (answer) => {
      played = answer;
    },
    (error: unknown) =>
      console.warn("[play] Couldn't tell whether this is a first play", error),
  );
  const game = await load();
  const tier = chooseTier(game.manifest.tiers, membership.grade);
  const id = newId();
  const key = outboxKey(student.id, id);
  const outbox = createOutbox({
    records: platform.records,
    storage,
    key,
    ...options.outboxTiming,
  });
  const leftovers = sendLeftovers({
    records: platform.records,
    storage,
    student: student.id,
    except: key,
    timing: options.outboxTiming,
  });
  const play = createPlay({
    id,
    manifest: game.manifest,
    tier,
    student: dressed,
    classId: membership.classId,
    outbox,
    links: platform.links,
    newId,
  });
  return {
    kind: "ready",
    ready: {
      link,
      student: dressed,
      membership,
      game,
      tier,
      play,
      firstPlay: () => tutorial || !played,
      outboxes: [outbox, ...leftovers],
    },
  };
}

/** The class with this join code, after joining it; or null when there's none. */
async function join(
  platform: Platform,
  joinCode: string,
): Promise<Membership | null> {
  try {
    return await platform.memberships.join(joinCode);
  } catch (error) {
    if (error instanceof NoSuchClass) return null;
    throw error;
  }
}

/**
 * The class to play a game for, from home: the one the link names, or else the first
 * the student joined. Only a class with the game on, where the student's
 * grade is set.
 */
function membershipFor(
  student: Student,
  link: GameLink,
): (Membership & { grade: number }) | undefined {
  const playable = student.classes.filter(
    (m): m is Membership & { grade: number } =>
      m.grade !== null && m.games.some((g) => g.slug === link.slug),
  );
  return playable.find((m) => m.classId === link.classId) ?? playable[0];
}
