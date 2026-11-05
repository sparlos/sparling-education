// Each item's PNG URL, for the browser. Kept apart from ./parts.ts so the API
// never resolves art.
import { fitMaskUrls } from "./fit-masks.ts";
import { avatarItemUrls } from "./generated/item-urls.ts";

/** The PNG of an item, or of one piece of it. */
export function itemUrl(item: string): string {
  const url = avatarItemUrls[item];
  if (!url) throw new Error(`No art for avatar item ${item}`);
  return url;
}

/** The mask blocking out parts of a piece, if it has one. */
export function maskUrl(piece: string): string | undefined {
  return fitMaskUrls[piece];
}

/** The pieces with a mask. */
export function maskedPieces(): string[] {
  return Object.keys(fitMaskUrls);
}
