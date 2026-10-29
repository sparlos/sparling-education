// One play of one game by one student: turns the game's attempts into
// records for the outbox, records how the play ended, and sends the student
// back to their locker.
import {
  type Attempt,
  attemptProblem,
  type GameManifest,
} from "@repo/game-contract";
import type { LinksPort, PlayEnding, Student } from "../platform/ports.ts";
import type { Outbox } from "./outbox.ts";

export type Ending = PlayEnding;

export interface Play {
  id: string;
  record(attempt: Attempt<GameManifest>): void;
  /**
   * Records how the play ended, sends what's left (waiting at most
   * `timeoutMs`), then gives the link back to the locker, naming this play.
   * A play ends once: later calls get the same link, and attempts after it
   * are dropped. Attempts recorded before a student leaves are kept and sent
   * like any others.
   */
  end(ending: Ending, timeoutMs?: number): Promise<string>;
}

export function createPlay(options: {
  id: string;
  manifest: GameManifest;
  tier: string;
  student: Student;
  /** The class it's played for. */
  classId: string;
  outbox: Outbox;
  links: LinksPort;
  newId: () => string;
  now?: () => Date;
  /** Called with a problem instead of recording an attempt the manifest doesn't allow. */
  onInvalid?: (problem: string, attempt: unknown) => void;
}): Play {
  const { manifest, tier, student, outbox } = options;
  const now = options.now ?? (() => new Date());
  const onInvalid =
    options.onInvalid ??
    ((problem, attempt) =>
      console.error(`[play] Dropped an attempt: ${problem}`, attempt));
  let ended: Promise<string> | null = null;

  function problemWith(attempt: Attempt<GameManifest>): string | null {
    if (ended) return "the play has already ended";
    return attemptProblem(manifest, tier, attempt);
  }

  function common() {
    return {
      id: options.newId(),
      play: options.id,
      student: student.id,
      class: options.classId,
      game: manifest.slug,
      gameVersion: manifest.version,
      tier,
      at: now().toISOString(),
    };
  }

  return {
    id: options.id,
    record(attempt) {
      const problem = problemWith(attempt);
      if (problem) return onInvalid(problem, attempt);
      outbox.add({
        ...common(),
        kind: "attempt",
        task: attempt.task,
        expectation: attempt.expectation,
        succeeded: attempt.succeeded,
        ...(attempt.misconception !== undefined && {
          misconception: attempt.misconception,
        }),
        ...(attempt.assisted !== undefined && { assisted: attempt.assisted }),
      });
    },
    end(ending, timeoutMs = 4000) {
      if (ended) return ended;
      outbox.add({ ...common(), kind: "end", ending });
      ended = outbox
        .drain(timeoutMs)
        .then(() => options.links.locker(options.id));
      return ended;
    },
  };
}
