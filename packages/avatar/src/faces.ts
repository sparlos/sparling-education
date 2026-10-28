// How each expression's face is drawn, relative to the eyes and mouth (`face`
// in ./parts.ts). Data only, so a preview can draw it without React;
// `./portrait.tsx` draws what it holds.
import type { AvatarExpression } from "./index.ts";

/** An eye open and looking, or shut in a smile. */
export type EyeState = "open" | "shut";

/**
 * A brow, from its rest above the eye: `lift` raises all of it, `tilt` raises
 * its inner end over its outer one (below 0 reads cross, above 0 worried),
 * and `arch` bows its middle up.
 */
export interface Brow {
  lift: number;
  tilt: number;
  arch: number;
}

export interface FaceDrawing {
  /** Each eye, left then right as you look at the avatar. */
  eyes: [EyeState, EyeState];
  /** Where open eyes look, from straight ahead. */
  gaze: { dx: number; dy: number };
  /** Left then right, as for `eyes`; none for a relaxed face. */
  brows?: [Brow, Brow];
  /** Path from the mouth's centre. */
  mouth: string;
  /** Filled: an open mouth. */
  mouthOpen: boolean;
}

const raised = (lift: number, arch: number): Brow => ({ lift, tilt: 0, arch });

export const faces: Record<AvatarExpression, FaceDrawing> = {
  neutral: {
    eyes: ["open", "open"],
    gaze: { dx: 0, dy: 0 },
    mouth: "M-2.4 0 Q0 0.9 2.4 0",
    mouthOpen: false,
  },
  happy: {
    eyes: ["open", "open"],
    gaze: { dx: 0, dy: 0 },
    brows: [raised(0.5, 0.7), raised(0.5, 0.7)],
    mouth: "M-4.4 -1.4 Q0 4.6 4.4 -1.4",
    mouthOpen: false,
  },
  // One brow up, the other level, eyes off to the side, mouth pursed aside.
  thinking: {
    eyes: ["open", "open"],
    gaze: { dx: 1, dy: -1 },
    brows: [raised(-0.2, 0.2), raised(1.8, 0.9)],
    mouth: "M-0.6 0.4 Q1.2 -0.3 3 0.2",
    mouthOpen: false,
  },
  // Cheering's grin and raised brows, a little smaller, eyes open on the student.
  encouraging: {
    eyes: ["open", "open"],
    gaze: { dx: 0, dy: 0 },
    brows: [raised(1.2, 0.9), raised(1.2, 0.9)],
    mouth: "M-4 -1.4 Q0 5.2 4 -1.4 Z",
    mouthOpen: true,
  },
  cheering: {
    eyes: ["shut", "shut"],
    gaze: { dx: 0, dy: 0 },
    brows: [raised(1.6, 1), raised(1.6, 1)],
    mouth: "M-4.6 -1.6 Q0 6.6 4.6 -1.6 Z",
    mouthOpen: true,
  },
};
