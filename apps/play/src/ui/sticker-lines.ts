// What stickers are called, shown and spoken.
import { type RecognitionTrait, traitOf } from "@repo/rewards";
import { shellT } from "./shared.tsx";
import type { ShellStringId } from "./shell-strings.ts";

/** What each recognition sticker is called and says: a teacher gave it. */
export const recognitionLines: Record<RecognitionTrait, ShellStringId> = {
  kindness: "recognition-kindness",
  perseverance: "recognition-perseverance",
  leadership: "recognition-leadership",
};

/** What a sticker is called, for a screen reader. */
export function stickerLabel(sticker: string): string {
  const trait = traitOf(sticker);
  return shellT(trait ? recognitionLines[trait] : "sticker");
}
