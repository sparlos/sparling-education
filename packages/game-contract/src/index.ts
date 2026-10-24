// The contract between a game and the play shell that hosts it.
//
// A game is a workspace package exporting `defineGame(manifest, Component)`.
// The shell owns everything else: sign-in, choosing the tier for the
// student's grade, the loading screen, voice-line playback, sending attempts
// to the API, and the trip back to the hub. A game never holds credentials,
// calls the API or navigates. See docs/DESIGN.md and
// docs/adr/0002-games-emit-attempts-platform-scores.md.
import type { AvatarExpression } from "@repo/avatar";
import type { ExpectationId } from "@repo/curriculum";
import type { ComponentType } from "react";

export type Locale = "en-CA" | "fr-CA";

export const defaultLocale: Locale = "en-CA";

/** React + SVG/DOM by default; PixiJS or PlayCanvas only when the game spec justifies it. */
export type Renderer = "dom" | "pixi" | "playcanvas";

export interface Tier {
  grade: number;
  /** The expectations this tier's attempts evidence. */
  expectations: readonly ExpectationId[];
}

export interface Misconception {
  /** The expectations whose attempts can reveal it. */
  expectations: readonly ExpectationId[];
}

export interface GameManifest {
  /** The game link's path: /play/<slug>. */
  slug: string;
  /**
   * Bump whenever what a tier evidences changes. Results keep the version
   * they were earned under, so old evidence stays accurate.
   */
  version: number;
  renderer: Renderer;
  /** Every game shows the avatar's portrait; "character" also puts it in the game. */
  avatar: "portrait" | "character";
  /**
   * A progression-based game, played as a set number of tasks: the shell
   * shows a thin progress bar ("2/6") above it, fed by `onProgress`.
   */
  progress?: boolean;
  tiers: Record<string, Tier>;
  misconceptions: Record<string, Misconception>;
  /**
   * Every string a student sees or hears, by ID. Each one also gets a voice
   * line generated at build time; the shell falls back to browser speech
   * until it exists. English is required; other locales are translations.
   */
  strings: { "en-CA": Record<string, string> } & Partial<
    Record<Locale, Record<string, string>>
  >;
}

export type TierId<M extends GameManifest> = keyof M["tiers"] & string;
export type MisconceptionId<M extends GameManifest> =
  keyof M["misconceptions"] & string;
export type StringId<M extends GameManifest> = keyof M["strings"]["en-CA"] &
  string;

/**
 * One try at one task. The shell adds the student, game version, tier and
 * time before sending it, and Kindling turns a play's attempts into its result.
 */
export interface Attempt<M extends GameManifest> {
  /** Identifies the task within this play, so retries of it can be recognised. */
  task: string;
  expectation: M["tiers"][TierId<M>]["expectations"][number];
  succeeded: boolean;
  misconception?: MisconceptionId<M>;
  /**
   * How much help the game gave on this task before the attempt, if any.
   * Kindling's scoring decides what it means for understanding and effort.
   */
  assisted?: "hint" | "demonstration" | "guided";
}

export type { AvatarExpression } from "@repo/avatar";

export interface Progress {
  /** Tasks finished. */
  done: number;
  /** Tasks in the play. */
  total: number;
}

export interface GameProps<M extends GameManifest> {
  tier: TierId<M>;
  locale: Locale;
  /** The student's avatar portrait, already dressed in their look. */
  Avatar: ComponentType<{ expression: AvatarExpression; size: number }>;
  /** The string in the student's locale. */
  t(id: StringId<M>): string;
  /**
   * Plays the strings' voice lines in a row, as one instruction ("This gap
   * needs" + "three fourths" + "of a plank."), so no string needs
   * interpolation. "Hear it again" replays the whole instruction. A new
   * call stops the one before.
   *
   * Settles when the instruction has been said, is cut off, or can't be
   * played (no sound), so a game can wait for the voice before acting:
   * speak, then act, never both at once. The shell only mounts a game after
   * the student taps start, so the browser lets the voice play.
   */
  say(...ids: StringId<M>[]): Promise<void>;
  onAttempt(attempt: Attempt<M>): void;
  /**
   * How far through the play the student is, for a game whose manifest sets
   * `progress`: call it at the start (0 done) and as each task is finished.
   * The shell ignores it otherwise.
   */
  onProgress(progress: Progress): void;
  /** The play is over; the shell takes the student back. */
  onFinish(): void;
}

export interface Game<M extends GameManifest> {
  manifest: M;
  Component: ComponentType<GameProps<M>>;
}

export function defineGame<const M extends GameManifest>(
  manifest: M,
  Component: ComponentType<GameProps<M>>,
): Game<M> {
  return { manifest, Component };
}
