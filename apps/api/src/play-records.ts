// Play records: each play's attempts and how it ended, as the play shell
// sends them. Stored as sent, once each, after checking them against the
// student's classes and the game's manifest at the version they were made
// under. Results are computed from them later (scoring.ts); rewards are
// granted as plays end (home.ts).
// The contract is in apps/play/src/platform/README.md.

import type { Db, DbTransaction } from "@repo/db";
import { attemptProblem } from "@repo/game-contract";
import { manifestAt } from "./games.ts";
import { grantRewards } from "./home.ts";
import type { PlayRecord } from "./schemas.ts";

export type Ingested =
  | { kind: "stored"; stored: number }
  | { kind: "not-their-records" }
  /** The batch will never be accepted; `problem` says why. */
  | { kind: "refused"; problem: string };

/**
 * Stores the signed-in student's batch, skipping records already stored.
 * The whole batch is stored or none of it is.
 */
export async function ingestPlayRecords(
  db: Db,
  studentId: string,
  batch: readonly PlayRecord[],
): Promise<Ingested> {
  if (batch.some((record) => record.student !== studentId))
    return { kind: "not-their-records" };
  if (batch.length === 0) return { kind: "stored", stored: 0 };

  return db.$transaction(async (tx) => {
    // One batch of a student's at a time, so rewards are counted once.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${studentId}))`;
    return ingest(tx, studentId, batch);
  });
}

async function ingest(
  db: DbTransaction,
  studentId: string,
  batch: readonly PlayRecord[],
): Promise<Ingested> {
  const known = new Set(
    (
      await db.playRecord.findMany({
        where: { studentId, id: { in: batch.map((r) => r.id) } },
        select: { id: true },
      })
    ).map((r) => r.id),
  );
  const fresh = batch.filter(
    (record, i) =>
      !known.has(record.id) &&
      batch.findIndex((other) => other.id === record.id) === i,
  );
  if (fresh.length === 0) return { kind: "stored", stored: 0 };

  const problem = await problemWith(db, studentId, fresh);
  if (problem) return { kind: "refused", problem };

  // Two sends of the same batch can race; the second skips what the first stored.
  const { count } = await db.playRecord.createMany({
    data: fresh.map((record) => toRow(studentId, record)),
    skipDuplicates: true,
  });
  await grantRewards(
    db,
    studentId,
    fresh.flatMap((r) =>
      r.kind === "end"
        ? [{ play: r.play, at: new Date(r.at), ending: r.ending }]
        : [],
    ),
  );
  return { kind: "stored", stored: count };
}

/**
 * Whether any of the student's records for the game is stored, from any
 * class, at any tier: a play counts as soon as one of its records arrives.
 */
export async function hasPlayed(
  db: Db,
  studentId: string,
  game: string,
): Promise<boolean> {
  return (
    (await db.playRecord.findFirst({
      where: { studentId, game },
      select: { id: true },
    })) !== null
  );
}

/** Why the new records can never be accepted, or null when they can. */
async function problemWith(
  db: DbTransaction,
  studentId: string,
  fresh: readonly PlayRecord[],
): Promise<string | null> {
  const classes = new Set(
    (
      await db.membership.findMany({
        where: { studentId },
        select: { classId: true },
      })
    ).map((m) => m.classId),
  );
  // Plays that have already ended: nothing more can be added to them.
  const ended = new Set(
    (
      await db.playRecord.findMany({
        where: {
          studentId,
          kind: "end",
          play: { in: [...new Set(fresh.map((r) => r.play))] },
        },
        select: { play: true },
      })
    ).map((r) => r.play),
  );

  // What each task in these plays asked, from its first attempt that said
  // (newest first, so the first is set last).
  const asked = new Map<string, string>();
  const askedKey = (r: { play: string; task: string }) => `${r.play}|${r.task}`;
  for (const r of await db.playRecord.findMany({
    where: {
      studentId,
      kind: "attempt",
      asked: { not: null },
      play: { in: [...new Set(fresh.map((r) => r.play))] },
    },
    select: { play: true, task: true, asked: true },
    orderBy: { sequence: "desc" },
  }))
    asked.set(askedKey({ play: r.play, task: r.task ?? "" }), r.asked ?? "");

  for (const record of fresh) {
    const about = `record ${record.id}`;
    if (!classes.has(record.class))
      return `${about}: the student isn't in class ${record.class}`;
    const manifest = manifestAt(record.game, record.gameVersion);
    if (!manifest)
      return `${about}: no game ${record.game} at version ${record.gameVersion}`;
    if (!manifest.tiers[record.tier])
      return `${about}: ${record.game} has no tier ${record.tier}`;
    if (ended.has(record.play))
      return `${about}: play ${record.play} has already ended`;
    if (record.kind === "end") {
      ended.add(record.play);
      continue;
    }
    const problem = attemptProblem(
      manifest,
      record.tier,
      record,
      asked.get(askedKey(record)),
    );
    if (problem) return `${about}: ${problem}`;
    if (record.asked !== undefined && !asked.has(askedKey(record)))
      asked.set(askedKey(record), record.asked);
  }
  return null;
}

/** A record as it's stored. */
export function toRow(studentId: string, record: PlayRecord) {
  const common = {
    studentId,
    id: record.id,
    classId: record.class,
    play: record.play,
    game: record.game,
    gameVersion: record.gameVersion,
    tier: record.tier,
    at: new Date(record.at),
    kind: record.kind,
  };
  return record.kind === "end"
    ? { ...common, ending: record.ending }
    : {
        ...common,
        task: record.task,
        expectation: record.expectation,
        succeeded: record.succeeded,
        misconception: record.misconception ?? null,
        assisted: record.assisted ?? null,
        asked: record.asked ?? null,
        detail: record.detail ?? null,
        exploring: record.exploring ?? false,
      };
}
