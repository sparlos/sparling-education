// A brief is everything one video needs: who it's for, what it says, how it
// sounds and which scene shows each line. The pipeline (scripts/make.ts)
// turns it into voice, music, a mix and a render; the Remotion composition
// (src/Video.tsx) reads the same brief plus the generated timings.
//
// Plain TypeScript, no JSX: Node loads briefs directly.

import type { Audience } from "@repo/tokens";

/** Which accent a video wears. "brand" is Kindling's ember. */
export type Tone = Audience | "brand";

export interface Format {
  width: number;
  height: number;
  fps: number;
}

export const landscape: Format = { width: 1920, height: 1080, fps: 30 };
export const vertical: Format = { width: 1080, height: 1920, fps: 30 };

/** Scene kinds and their props. Each has a component in src/scenes. */
export type Scene =
  | {
      kind: "kinetic";
      /** Lines of big type, each word pops in. `*word*` gets the accent. */
      lines: string[];
      /** Small label above the lines. */
      eyebrow?: string;
    }
  | {
      kind: "not-a-quiz";
      /** Small header on the card, e.g. "Question 3 of 10". */
      header: string;
      /** The quiz question on the card that gets crossed out. */
      question: string;
      /** Multiple-choice answers on the card. */
      answers: string[];
      /** "Game costume" stickers slapped on the card, e.g. "+10 XP". */
      stickers: string[];
      /** The stamp across it. */
      stamp: string;
    }
  | {
      kind: "class";
      /** Students' nicknames, one tile each (their avatars follow from them). */
      nicknames: string[];
      /** The word the whole class cheers on. */
      cheerOn: string;
    }
  | {
      kind: "logo";
      /** Line under the wordmark. */
      tagline: string;
    }
  | {
      kind: "fraction-hop";
      /** What the course shows: a clean run to the goal, or a splash. */
      mode: "solve" | "splash";
      /** Goal fraction, e.g. [3, 8]. */
      goal: [number, number];
      /** Planned hops as denominators of unit fractions (1 = whole). */
      plan: number[];
      /** Tick denominator. */
      ticks: number;
      /** Ticks (0 = start) with a stone; default every tick. */
      stones?: number[];
      /** The game's own UI text, as students see it. */
      labels: { goalAt: string; plan: string; play: string; result: string };
      /** Caption chip in the corner, e.g. "Fraction Hop · Grades 3–5". */
      label: string;
    }
  | {
      kind: "teacher-view";
      title: string;
      /** Small label above the title, e.g. the expectation code. */
      eyebrow: string;
      students: { name: string; status: StudentStatus; progress: number }[];
      statusLabels: Record<StudentStatus, string>;
      /** The misconception callout that slides in. */
      insight: { title: string; body: string };
    }
  | {
      kind: "features";
      title: string;
      items: { icon: FeatureIcon; label: string }[];
    }
  | {
      kind: "end-card";
      headline: string;
      /** The pill under the headline, e.g. "Free for teachers. Always." */
      note: string;
      cta: string;
      url?: string;
    };

export type SceneKind = Scene["kind"];
export type StudentStatus = "got-it" | "practising" | "stuck";
export type FeatureIcon = "curriculum" | "chromebook" | "classroom" | "chart";

/** Transitions into a beat (see src/transitions.ts). */
export type TransitionKind =
  | "slide"
  | "wipe"
  | "flip"
  | "iris"
  | "clock-wipe"
  | "zoom"
  | "push"
  | "fade"
  | "cut";

export interface Beat {
  /** Stable ID: names the beat's voice file. */
  id: string;
  /** Exactly what the voice says, and the caption shown. */
  vo: string;
  /**
   * Model-only rewrite of `vo` (pacing, pronunciation). Captions always
   * show `vo`.
   */
  say?: string;
  scene: Scene;
  /** Transition into this beat; ignored on the first. Default "slide". */
  transition?: TransitionKind;
  /** Seconds of picture before the voice starts. Default 0.35. */
  leadIn?: number;
  /** Seconds after the voice ends before the next transition. Default 0.5. */
  tail?: number;
  /** Shortest the beat can be, in seconds, if the scene needs time. */
  minSeconds?: number;
  /**
   * Show captions. Default: on, except for scenes that put the words on
   * screen themselves (kinetic).
   */
  captions?: boolean;
  /** Fire a light leak over the start of this beat. */
  lightLeak?: boolean;
}

export interface Brief {
  /** Folder name under videos/ and the composition ID. */
  id: string;
  /** Who it's for; picks the accent and steers the copy. */
  audience: string;
  tone: Tone;
  format: Format;
  voice: {
    /**
     * An @repo/voice voice (packages/voice/voices/<name>): the games' own
     * Kokoro voice, settings and pronunciations. Default: "narrator".
     */
    name?: string;
    /** Tempo, applied with ffmpeg's time-stretch. Default: the voice's. */
    speed?: number;
  };
  music: {
    /** Tempo; beat lengths snap to this grid so cuts land on the beat. */
    bpm: number;
    /**
     * Strudel code for the bed. Gets the length in bars, so it can build an
     * intro and an ending. Evaluated in the Strudel REPL's scope.
     */
    pattern: (bars: number) => string;
  };
  /** Mix levels, in LUFS and dB. Defaults in scripts/mix.ts. */
  mix?: Partial<MixLevels>;
  beats: Beat[];
}

export interface MixLevels {
  /** Loudness of the finished mix (web video: -14). */
  targetLufs: number;
  /** Music bed relative to the voice, before ducking. */
  musicDb: number;
  /** How far the bed drops under the voice. */
  duckDb: number;
  /** Transition whooshes relative to the voice. */
  sfxDb: number;
}

export function defineBrief(brief: Brief): Brief {
  const ids = new Set<string>();
  for (const beat of brief.beats) {
    if (ids.has(beat.id)) throw new Error(`duplicate beat id "${beat.id}"`);
    ids.add(beat.id);
  }
  return brief;
}
