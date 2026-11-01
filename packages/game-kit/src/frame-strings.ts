// The words of the controls every game shares, so no game can word them its
// own way. A game spreads these into its strings, and they stay in its
// SPEC.md's table and get its voice lines like any other string.
//
// Its own module, with no React or CSS: the voice tool and the API import a
// game's manifest, and so its strings, in plain Node.
export const frameStrings = {
  "ui.hint": "Hint",
  "ui.skip": "Skip",
  "hint.ready": "Want a hint? Tap the hint button.",
} as const;

/** For a game whose help ladder has a second hint. */
export const hintAgainStrings = {
  "hint.ready-again": "Want another hint? Tap the hint button again.",
} as const;

export type FrameStringId = keyof typeof frameStrings;
