// Turns the URL a student opened into a play that's ready to start, or says
// why it can't start.
import type { GameRegistry, HostedGame } from "../games.ts";
import type { Membership, Platform, Student } from "../platform/ports.ts";
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
  student: Student;
  /** The class the play is for, with the student's grade in it. */
  membership: Membership & { grade: number };
  game: HostedGame;
  tier: string;
  play: Play;
  /** This play's outbox and those of earlier plays still sending; dispose them all when done. */
  outboxes: Outbox[];
}

export type Boot =
  | { kind: "sign-in"; url: string }
  /** No class of theirs can play it yet; the locker shows why. */
  | { kind: "locker" }
  | { kind: "not-found" }
  | { kind: "ready"; ready: ReadyPlay };

/** Rejects when the session can't be checked or the game can't be loaded. */
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

  const membership = membershipFor(student, link);
  if (!membership) return { kind: "locker" };

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
    student,
    classId: membership.classId,
    portal: link.portal,
    outbox,
    links: platform.links,
    newId,
  });
  return {
    kind: "ready",
    ready: {
      link,
      student,
      membership,
      game,
      tier,
      play,
      outboxes: [outbox, ...leftovers],
    },
  };
}

/**
 * The class to play a game for: the one the link names, or else the first
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
