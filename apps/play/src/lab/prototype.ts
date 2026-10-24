// What a prototype in the lab is: a rough, throwaway component that answers
// "is this mechanic fun, and does playing it exercise the concept?" before a
// game spec is written. See README.md.
import type { AvatarExpression } from "@repo/avatar";
import type { ComponentType } from "react";

/** What a prototype targets. Not optional: finding the fun must stay grounded in the curriculum. */
export interface PrototypeMeta {
  title: string;
  /** One line: what the student does. */
  pitch: string;
  /**
   * Reference-layer expectation IDs, e.g. "math-2020.g4.B1.5", each read in
   * full in `packages/curriculum/reference/`. The lab's test rejects any that
   * don't exist.
   */
  expectations: readonly string[];
  /** The misconceptions it should make visibly fail. At least one. */
  misconceptions: readonly PrototypeMisconception[];
  /** The curriculum sample task or example it draws on, if any, by expectation ID and in your own words. */
  sampleTask?: string;
  /** Why it might be fun, including the game or genre it borrows from. */
  fun: string;
  /**
   * Played and not picked, or kept from a past design-game run. Listed under
   * the lab's Archive tab, still playable, so the founder can revisit it.
   */
  isArchived?: boolean;
}

export interface PrototypeMisconception {
  /** Named by the wrong idea, e.g. "bigger-denominator-bigger". */
  id: string;
  /** What the student does under the wrong idea, and what visibly fails. */
  fails: string;
}

/** What the lab gives a prototype. No sign-in, no game contract, no strings table. */
export interface PrototypeProps {
  /** The grade picked on the lab page, 1–8. */
  grade: number;
  /** The student's portrait. */
  Avatar: ComponentType<{ expression: AvatarExpression; size: number }>;
  /** Says plain text aloud with browser speech. The lab's "hear it again" replays the last one. */
  speak(text: string): void;
}

/** A prototype module: `apps/play/src/lab/<slug>/index.tsx`. */
export interface PrototypeModule {
  meta: PrototypeMeta;
  default: ComponentType<PrototypeProps>;
}
