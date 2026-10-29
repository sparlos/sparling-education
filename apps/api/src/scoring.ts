// Scoring: what a student's stored play records show. Every rule Kindling
// scores by lives here, so rules change without touching games or the
// records they've already sent (ADR 0002). The rules are provisional until
// the pilot's data settles them (docs/DESIGN.md, open questions).

import type { LearningSkill } from "@repo/curriculum";
import type { GameManifest } from "@repo/game-contract";

/** The provisional understanding rule's settings. */
export const understandingRule = {
  /** Only a student's most recent plays at a tier count, by device time. */
  recentPlays: 5,
  /** From this share of tasks succeeded at without help: "developing". */
  developingFrom: 0.5,
  /** From this share: "showing consistently"… */
  consistentlyFrom: 0.8,
  /** …once there are at least this many tasks to show it. */
  consistentlyNeedsTasks: 4,
} as const;

/** The provisional rule for which misconceptions a student is showing. */
export const misconceptionRule = {
  /** Only a student's most recent plays of each game count, by device time. */
  recentPlays: 5,
} as const;

/**
 * The provisional effort rule: what counts as effort, and the Learning Skill
 * each kind is evidence of (Growing Success). Nothing else counts: not raw
 * attempts, retries alone or time spent.
 */
export const effortRule = {
  /**
   * A task with a failed try that's later succeeded at in the same play,
   * with help or without: Self-Regulation ("perseveres and makes an effort
   * when responding to challenges"). It counts once however many tries it
   * took, so spamming attempts adds nothing.
   */
  improvedAfterMistake: "self-regulation",
  /**
   * A play the student finished: Responsibility ("completes and submits
   * class work").
   */
  finishedPlays: "responsibility",
} as const satisfies Record<string, LearningSkill>;

export type EffortKind = keyof typeof effortRule;

/** What effort reads of a record. */
export type EffortRecord = Pick<
  ScoredRecord,
  | "studentId"
  | "play"
  | "kind"
  | "task"
  | "succeeded"
  | "exploring"
  | "ending"
  | "sequence"
>;

/** One student's effort, by kind. */
export interface StudentEffort extends Record<EffortKind, number> {
  studentId: string;
}

/**
 * Effort, per student, from their records. A crashed play counts neither for
 * nor against them; a play they left partway counts its improvements but
 * not as finished. Tries that only explored are neither failed nor
 * succeeded.
 */
export function effortOf(all: readonly EffortRecord[]): StudentEffort[] {
  const records = scored(all);
  const crashed = crashedPlays(records);
  return groupBy(records, (r) => r.studentId).map((theirs) => {
    const plays = groupBy(
      theirs.filter((r) => !crashed.has(playKey(r))),
      (r) => r.play,
    );
    return {
      studentId: theirs[0]?.studentId ?? "",
      improvedAfterMistake: sum(
        plays.map(
          (play) =>
            groupBy(
              play.filter((r) => r.kind === "attempt"),
              (a) => a.task ?? "",
            ).filter(improvedAfterMistake).length,
        ),
      ),
      finishedPlays: plays.filter((play) =>
        play.some((r) => r.kind === "end" && r.ending === "finished"),
      ).length,
    };
  });
}

/** A task's tries include a failed one with a success after it. */
function improvedAfterMistake(tries: readonly EffortRecord[]) {
  const inOrder = [...tries].sort((a, b) => a.sequence - b.sequence);
  const firstFailed = inOrder.findIndex((a) => !a.succeeded);
  return (
    firstFailed >= 0 && inOrder.slice(firstFailed).some((a) => a.succeeded)
  );
}

export type Understanding =
  | "not-yet-showing"
  | "developing"
  | "showing-consistently";

/** A stored record, as scoring reads it. */
export interface ScoredRecord {
  studentId: string;
  play: string;
  game: string;
  gameVersion: number;
  tier: string;
  at: Date;
  kind: "attempt" | "end";
  task: string | null;
  expectation: string | null;
  succeeded: boolean | null;
  misconception: string | null;
  assisted: string | null;
  /** A try that only explored: every rule here leaves it out. */
  exploring: boolean;
  ending: string | null;
  /** Arrival order: within a play, the order the shell made them in. */
  sequence: number;
}

/** One student's understanding of one expectation, at one tier's grade. */
export interface StudentResult {
  studentId: string;
  /** With its curriculum edition, e.g. "math-2020.g4.B1.6". */
  expectation: string;
  understanding: Understanding;
  /** The grade of the tier it was earned at. */
  tierGrade: number;
  /** The games, tiers and versions it came from. */
  games: { slug: string; tier: string; version: number }[];
  /** When the latest play it counts was played, by device time. */
  latest: Date;
  /** The plays it counts. */
  plays: string[];
}

/**
 * Understanding, per student, expectation and tier grade, from their records.
 *
 * The rule: the share of an expectation's tasks the student ended up
 * succeeding at without help, over their recent plays at that tier. A task
 * counts once however many tries it took; it's succeeded at without help
 * when one of its attempts succeeded with no help before it. A crashed play
 * counts neither for nor against them, and tries that only explored don't
 * count at all: a play with nothing else isn't one of their recent plays.
 */
export function understandingOf(
  all: readonly ScoredRecord[],
  manifestAt: (slug: string, version: number) => GameManifest | undefined,
): StudentResult[] {
  return recentAtTiers(all, manifestAt).map(
    ({ studentId, expectation, tierGrade, recent }) => {
      const tallies = recent.map(tallyOf);
      const tasks = sum(tallies.map((t) => t.tasks));
      const succeeded = sum(tallies.map((t) => t.onTheirOwn));
      const games = new Map(
        recent
          .flat()
          .map(({ game, tier, gameVersion }) => [
            `${game}|${tier}|${gameVersion}`,
            { slug: game, tier, version: gameVersion },
          ]),
      );
      return {
        studentId,
        expectation,
        understanding: band(succeeded, tasks),
        tierGrade,
        games: [...games.values()],
        latest: new Date(Math.max(...recent.flat().map((a) => +a.at))),
        plays: recent.map(([first]) => first?.play ?? ""),
      };
    },
  );
}

/**
 * Each student's recent plays at each expectation and tier grade, each play
 * as its attempts at that expectation: the plays understanding counts.
 */
function recentAtTiers<R extends Choosing>(
  all: readonly R[],
  manifestAt: (slug: string, version: number) => GameManifest | undefined,
) {
  const records = scored(all);
  const crashed = crashedPlays(records);

  // Each play's attempts, grouped by student, expectation and tier grade.
  const groups = new Map<
    string,
    {
      studentId: string;
      expectation: string;
      tierGrade: number;
      plays: Map<string, R[]>;
    }
  >();
  for (const record of records) {
    if (record.kind !== "attempt" || !record.expectation) continue;
    if (crashed.has(playKey(record))) continue;
    const tierGrade = manifestAt(record.game, record.gameVersion)?.tiers[
      record.tier
    ]?.grade;
    if (tierGrade === undefined) continue;
    const key = `${record.studentId}|${record.expectation}|${tierGrade}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        studentId: record.studentId,
        expectation: record.expectation,
        tierGrade,
        plays: new Map(),
      };
      groups.set(key, group);
    }
    const play = group.plays.get(record.play) ?? [];
    play.push(record);
    group.plays.set(record.play, play);
  }

  return [...groups.values()].map(
    ({ studentId, expectation, tierGrade, plays }) => ({
      studentId,
      expectation,
      tierGrade,
      recent: newestFirst([...plays.values()]).slice(
        0,
        understandingRule.recentPlays,
      ),
    }),
  );
}

/** A misconception a student is showing, in one game. */
export interface ShownMisconception {
  studentId: string;
  game: string;
  /** The game's version at the latest attempt that revealed it. */
  gameVersion: number;
  misconception: string;
  /** The expectation of the latest attempt that revealed it. */
  expectation: string;
  /** When it was last revealed, by device time. */
  latest: Date;
}

/**
 * The misconceptions each student is showing: those revealed by any attempt
 * in their recent plays of a game. Crashed plays and exploring tries don't
 * count, as for understanding.
 */
export function misconceptionsOf(
  all: readonly ScoredRecord[],
): ShownMisconception[] {
  return recentOfGames(all).flatMap((recent) =>
    groupBy(
      recent.flat().filter((r) => r.misconception),
      (r) => r.misconception ?? "",
    ).map((revealing) => {
      const last = revealing.reduce((a, b) => (+b.at > +a.at ? b : a));
      return {
        studentId: last.studentId,
        game: last.game,
        gameVersion: last.gameVersion,
        misconception: last.misconception ?? "",
        expectation: last.expectation ?? "",
        latest: last.at,
      };
    }),
  );
}

/**
 * Each student's recent plays of each game, each play as its attempts: the
 * plays misconceptions come from.
 */
function recentOfGames<R extends Choosing>(all: readonly R[]) {
  const records = scored(all);
  const crashed = crashedPlays(records);
  const attempts = records.filter(
    (r) => r.kind === "attempt" && !crashed.has(playKey(r)),
  );
  return groupBy(attempts, (r) => `${r.studentId}|${r.game}`).map((theirs) =>
    newestFirst(groupBy(theirs, (r) => r.play)).slice(
      0,
      misconceptionRule.recentPlays,
    ),
  );
}

/** What choosing which plays count reads of a record. */
export type Choosing = Pick<
  ScoredRecord,
  (typeof choosingFields)[number] | "at" | "sequence"
>;

/**
 * The fields of a record that which plays count depends on, besides when it
 * was made and sent. Records grouped by these, keeping each group's earliest
 * `at` and `sequence`, choose the same plays as the records themselves, so a
 * query can find the plays to load without loading every record.
 */
export const choosingFields = [
  "studentId",
  "play",
  "game",
  "gameVersion",
  "tier",
  "kind",
  "expectation",
  "exploring",
  "ending",
] as const;

/**
 * The plays understanding and misconceptions count, from the records or
 * their groups by `choosingFields`. Scoring just these plays' records gives
 * the same results as scoring every record.
 */
export function playsCounted(
  all: readonly Choosing[],
  manifestAt: (slug: string, version: number) => GameManifest | undefined,
): { studentId: string; play: string }[] {
  const plays = [
    ...recentAtTiers(all, manifestAt).flatMap((r) => r.recent),
    ...recentOfGames(all).flat(),
  ].flatMap(([first]) => (first ? [first] : []));
  return [
    ...new Map(
      plays.map(({ studentId, play }) => [
        playKey({ studentId, play }),
        { studentId, play },
      ]),
    ).values(),
  ];
}

/** How a play's tasks went, each counted once however many tries it took. */
export interface PlayTally {
  /** Tries at the tasks, retries included. */
  tries: number;
  /** Tries that only explored, which nothing else here counts. */
  explored: number;
  tasks: number;
  /** Succeeded at without help: what understanding counts. */
  onTheirOwn: number;
  /** Succeeded at only with help. */
  withHelp: number;
  /** Never succeeded at. */
  notYet: number;
}

export function tallyOf(all: readonly ScoredRecord[]): PlayTally {
  const attempts = scored(all);
  const tasks = groupBy(attempts, (a) => a.task ?? "");
  const onTheirOwn = tasks.filter((tries) =>
    tries.some((a) => a.succeeded && !a.assisted),
  ).length;
  const succeeded = tasks.filter((tries) =>
    tries.some((a) => a.succeeded),
  ).length;
  return {
    tries: attempts.length,
    explored: all.length - attempts.length,
    tasks: tasks.length,
    onTheirOwn,
    withHelp: succeeded - onTheirOwn,
    notYet: tasks.length - succeeded,
  };
}

/** The records scoring counts: all but tries that only explored. */
function scored<R extends Pick<ScoredRecord, "exploring">>(
  records: readonly R[],
) {
  return records.filter((r) => !r.exploring);
}

function crashedPlays(
  records: readonly Pick<
    ScoredRecord,
    "studentId" | "play" | "kind" | "ending"
  >[],
) {
  return new Set(
    records
      .filter((r) => r.kind === "end" && r.ending === "crashed")
      .map((r) => playKey(r)),
  );
}

/** Plays, newest first by when they started; plays that started together, by arrival. */
export function newestFirst<P extends readonly Sent[]>(
  plays: readonly P[],
): P[] {
  return [...plays].sort(
    (a, b) => startOf(b) - startOf(a) || firstSent(b) - firstSent(a),
  );
}

function firstSent(records: readonly Sent[]) {
  return Math.min(...records.map((r) => r.sequence));
}

function band(succeeded: number, tasks: number): Understanding {
  const share = succeeded / tasks;
  const { developingFrom, consistentlyFrom, consistentlyNeedsTasks } =
    understandingRule;
  if (share >= consistentlyFrom && tasks >= consistentlyNeedsTasks)
    return "showing-consistently";
  if (share >= developingFrom) return "developing";
  return "not-yet-showing";
}

function playKey(record: { studentId: string; play: string }) {
  return `${record.studentId}|${record.play}`;
}

/** When a play started, by device time: its earliest record. */
export function startOf(attempts: readonly Sent[]) {
  return Math.min(...attempts.map((a) => +a.at));
}

/** When a record was made and sent. */
type Sent = Pick<ScoredRecord, "at" | "sequence">;

const sum = (ns: readonly number[]) => ns.reduce((a, b) => a + b, 0);

/** The items in groups by key, in the order each key first appears. */
export function groupBy<T>(items: readonly T[], key: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    groups.set(k, [...(groups.get(k) ?? []), item]);
  }
  return [...groups.values()];
}
