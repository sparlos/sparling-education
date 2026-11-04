// The tutorial's tiny wave (SPEC.md's Tutorial section): 2 lanes of 3 bugs,
// never recorded and never counted as help.
import { makeWave } from "../rules/parts.ts";

export const tutorialWave = makeWave([2], [3]);
export const rightDarts = 6;
export const extraDarts = 7;
/** How long a tap takes to show before it happens. */
export const tapMs = 300;
/** A beat after each tap or line. */
export const beatMs = 400;
/** The least a line holds the screen, so its caption can be read when there's no sound. */
export const minLineMs = 1500;
