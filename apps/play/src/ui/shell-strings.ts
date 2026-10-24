// The shell's own words. Like a game's strings, each is shown and spoken by ID.
import type { GameManifest } from "@repo/game-contract";

export const shellStrings = {
  "en-CA": {
    loading: "Getting your game ready…",
    "hear-again": "Hear it again",
    "not-found": "We couldn't find that game.",
    error: "Something went wrong. Let's try that again.",
    "try-again": "Try again",
    complete: "Well done!",
    left: "See you next time!",
    "play-again": "Play again",
    saving: "Saving your work…",
    leave: "Leave the game",
    "leave-question": "Do you want to stop playing?",
    "keep-playing": "Keep playing",
    avatar: "Your avatar",
    start: "Start",
    progress: "Tasks done",
  },
} satisfies GameManifest["strings"];

export type ShellStringId = keyof (typeof shellStrings)["en-CA"];
