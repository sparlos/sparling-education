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
  /** Left then right, as for `eyes`. */
  brows: [Brow, Brow];
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
    brows: [raised(0, 4), raised(0, 4)],
    mouth: "M-13 0 Q0 6 13 0",
    mouthOpen: false,
  },
  // As the art draws it.
  happy: {
    eyes: ["open", "open"],
    gaze: { dx: 0, dy: 0 },
    brows: [raised(2, 5), raised(2, 5)],
    mouth: "M-20 -5 Q0 15 20 -5",
    mouthOpen: false,
  },
  // One brow up, the other level, eyes off to the side, mouth pursed aside.
  thinking: {
    eyes: ["open", "open"],
    gaze: { dx: 4, dy: -4 },
    brows: [raised(-2, 2), raised(9, 5)],
    mouth: "M-3 2 Q6 -2 16 1",
    mouthOpen: false,
  },
  // Cheering's grin and raised brows, a little smaller, eyes open on the student.
  encouraging: {
    eyes: ["open", "open"],
    gaze: { dx: 0, dy: 0 },
    brows: [raised(5, 5), raised(5, 5)],
    mouth: "M-18 -6 Q0 22 18 -6 Z",
    mouthOpen: true,
  },
  cheering: {
    eyes: ["shut", "shut"],
    gaze: { dx: 0, dy: 0 },
    brows: [raised(8, 6), raised(8, 6)],
    mouth: "M-21 -7 Q0 28 21 -7 Z",
    mouthOpen: true,
  },
};
