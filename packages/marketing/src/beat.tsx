// What a scene knows about its beat: its length, when its voice starts and
// when each word is spoken, so scenes can land moments on words ("press
// *play*" presses play as the word is said).

import { motion } from "@repo/tokens";
import { createContext, useContext } from "react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Tone } from "./brief.ts";
import type { Word } from "./timeline.ts";

export interface BeatInfo {
  tone: Tone;
  durationInFrames: number;
  /** Frame (within the beat) the voice starts. */
  voiceFrom: number;
  voiceFrames: number;
  words: Word[];
}

export const BeatContext = createContext<BeatInfo | null>(null);

export function useBeat() {
  const beat = useContext(BeatContext);
  const { fps } = useVideoConfig();
  if (!beat) throw new Error("useBeat outside a beat");
  const wordFrame = (i: number) =>
    beat.voiceFrom + Math.round(((beat.words[i]?.startMs ?? 0) / 1000) * fps);
  return {
    ...beat,
    wordFrame,
    /**
     * Frame the first word matching `match` (case and punctuation ignored) is
     * spoken, searching from word `after`. Falls back to `fallback` × the
     * voice's length when no word matches.
     */
    cue(match: string, fallback = 0.5, after = 0) {
      return (
        this.find(match, after) ??
        beat.voiceFrom + Math.round(beat.voiceFrames * fallback)
      );
    },
    /** Like `cue`, but null when no word matches. */
    find(match: string, after = 0): number | null {
      const want = match.toLowerCase().replace(/[^a-z0-9]/g, "");
      const i = beat.words.findIndex(
        (w, k) =>
          k >= after && w.text.toLowerCase().replace(/[^a-z0-9]/g, "") === want,
      );
      return i >= 0 ? wordFrame(i) : null;
    },
  };
}

/** Bouncy 0→1 (overshoots) from `from`. The tokens' bouncy spring. */
export function usePop(from: number, bouncy = true) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const config = bouncy ? motion.spring.bouncy : motion.spring.gentle;
  return spring({
    frame: frame - from,
    fps,
    config: { mass: 1, ...config },
  });
}

/** Eased 0→1 between two frames. */
export function useRamp(from: number, to: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.2, 0, 0, 1),
  });
}
