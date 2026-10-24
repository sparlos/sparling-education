// A fake play shell for a game's tests: it mounts the game through the
// contract, with the props the real shell passes, and records what comes out
// (lines said, attempts, progress, finishing). It also checks every call
// against the contract and the manifest, and the setup file fails the test
// on any breach, so a game test can't pass while the game breaks the rules.
//
// Use with Vitest's fake timers (`vi.useFakeTimers()`): the game's pauses and
// animations are timers, and `wait` advances them. Taps are `fireEvent`
// clicks inside `act`, because `userEvent` stalls under Vitest's fake timers.
import type {
  Attempt,
  Game,
  GameManifest,
  GameProps,
  Progress,
  StringId,
  TierId,
} from "@repo/game-contract";
import { act, fireEvent, render } from "@testing-library/react";
import { vi } from "vitest";

export interface FakeShellOptions<M extends GameManifest> {
  tier: TierId<M>;
  /**
   * What each `say` returns. By default every line is said at once. Pass
   * `heldVoice().voice` to finish lines by hand and test turn-taking.
   */
  voice?: () => Promise<void>;
  /**
   * `Math.random()` returns this during the first render, so a game that
   * seeds its generator from it plays a known set of tasks.
   */
  random?: number;
}

export interface FakeShell<M extends GameManifest> {
  props: GameProps<M>;
  /** Every `say(...)`, in order, each as its list of string IDs. */
  said: StringId<M>[][];
  lastSaid(): StringId<M>[];
  attempts(): Attempt<M>[];
  progress(): Progress[];
  /** How many times the game called `onFinish`. */
  finished(): number;
  /** Taps an element: a click, with React's updates flushed. */
  tap(el: Element): Promise<void>;
  /** Lets `ms` pass on the fake clock, settling promises along the way. */
  wait(ms: number): Promise<void>;
}

const problems: string[] = [];

/** Contract breaches seen since the last call. The setup file fails the test on any. */
export function takeContractProblems(): string[] {
  return problems.splice(0);
}

/** Why an attempt breaks the contract for this tier, if it does. */
export function attemptProblems<M extends GameManifest>(
  manifest: M,
  tier: string,
  attempt: Attempt<M>,
): string[] {
  const found: string[] = [];
  const tierDef = manifest.tiers[tier];
  const expectations: readonly string[] = tierDef?.expectations ?? [];
  if (typeof attempt.task !== "string" || attempt.task === "")
    found.push("an attempt has no task ID");
  if (!expectations.includes(attempt.expectation))
    found.push(
      `attempt on ${attempt.task}: ${attempt.expectation} isn't one of tier ${tier}'s expectations`,
    );
  if (typeof attempt.succeeded !== "boolean")
    found.push(`attempt on ${attempt.task}: succeeded isn't a boolean`);
  if (attempt.misconception !== undefined) {
    const m = manifest.misconceptions[attempt.misconception];
    if (!m)
      found.push(
        `attempt on ${attempt.task}: unknown misconception ${attempt.misconception}`,
      );
    else if (
      !(m.expectations as readonly string[]).includes(attempt.expectation)
    )
      found.push(
        `attempt on ${attempt.task}: ${attempt.misconception} doesn't belong to ${attempt.expectation}`,
      );
  }
  if (
    attempt.assisted !== undefined &&
    !["hint", "demonstration", "guided"].includes(attempt.assisted)
  )
    found.push(`attempt on ${attempt.task}: unknown help ${attempt.assisted}`);
  return found;
}

/** Lets `ms` pass on Vitest's fake clock, settling promises along the way. */
export const wait = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

/** Mounts a game in the fake shell. */
export function mountGame<M extends GameManifest>(
  game: Game<M>,
  options: FakeShellOptions<M>,
): FakeShell<M> {
  const { manifest } = game;
  const { tier, voice = () => Promise.resolve(), random } = options;
  const strings: Record<string, string> = manifest.strings["en-CA"];
  const said: StringId<M>[][] = [];
  const attempts: Attempt<M>[] = [];
  const progress: Progress[] = [];
  let finished = 0;
  const knownString = (id: string, via: string) => {
    if (!(id in strings)) problems.push(`${via}("${id}"): no such string`);
  };
  const props: GameProps<M> = {
    tier,
    locale: "en-CA",
    Avatar: ({ expression }) => (
      <span data-testid="avatar" data-expression={expression} />
    ),
    t: (id) => {
      knownString(id, "t");
      return strings[id] ?? id;
    },
    say: (...ids) => {
      if (ids.length === 0) problems.push("say() with no lines");
      for (const id of ids) knownString(id, "say");
      said.push(ids);
      return voice();
    },
    onAttempt: (attempt) => {
      if (finished) problems.push(`attempt on ${attempt.task} after finishing`);
      problems.push(...attemptProblems(manifest, tier, attempt));
      attempts.push(attempt);
    },
    onProgress: (p) => {
      if (!manifest.progress)
        problems.push("onProgress, but the manifest doesn't set progress");
      const last = progress.at(-1);
      if (p.done < 0 || p.done > p.total)
        problems.push(`progress ${p.done}/${p.total} is out of range`);
      if (last && (p.done < last.done || p.total !== last.total))
        problems.push(
          `progress went from ${last.done}/${last.total} to ${p.done}/${p.total}`,
        );
      progress.push(p);
    },
    onFinish: () => {
      finished++;
      if (finished > 1) problems.push("onFinish called more than once");
    },
  };
  if (random !== undefined) vi.spyOn(Math, "random").mockReturnValue(random);
  render(<game.Component {...props} />);
  if (random !== undefined) vi.mocked(Math.random).mockRestore();
  return {
    props,
    said,
    lastSaid: () => said.at(-1) ?? [],
    attempts: () => [...attempts],
    progress: () => [...progress],
    finished: () => finished,
    tap: async (el) => {
      await act(async () => {
        fireEvent.click(el);
      });
    },
    wait,
  };
}

/**
 * A voice whose lines finish only when the test says so, for checking that
 * the voice and the screen take turns: nothing acts until the line is said.
 */
export function heldVoice() {
  let finish = () => {};
  return {
    voice: () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    /** Finishes the line being said now. */
    finishLine: () => finish(),
  };
}
