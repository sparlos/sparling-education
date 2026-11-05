// What the avatar fit tool saves, checked and written out as source. Used by
// the dev server's save endpoint, never at runtime.
import { type Box, cutBoxes } from "./parts.ts";

const round = (n: number) => Math.round(n * 10) / 10;

/** Fits as sent by the tool, or null if they aren't valid. */
export function parseFits(value: unknown): Record<string, Box> | null {
  if (typeof value !== "object" || value === null) return null;
  const out: Record<string, Box> = {};
  for (const [id, box] of Object.entries(value)) {
    if (!isPiece(id) || typeof box !== "object" || box === null) return null;
    const { x, y, width, height } = box as Record<string, unknown>;
    const numbers = [x, y, width, height];
    if (!numbers.every((n) => typeof n === "number" && Number.isFinite(n)))
      return null;
    if ((width as number) <= 0 || (height as number) <= 0) return null;
    out[id] = {
      x: round(x as number),
      y: round(y as number),
      width: round(width as number),
      height: round(height as number),
    };
  }
  return out;
}

/** Whether `id` names a picture, so it's safe in a path. */
export function isPiece(id: string): boolean {
  return Object.hasOwn(cutBoxes, id);
}

const header =
  "// Written by the avatar fit tool (/play/avatar-fit in dev). Don't edit by hand.\n";

/** The source of `fits.ts`. */
export function fitsSource(fits: Record<string, Box>): string {
  const ids = Object.keys(fits).sort();
  if (ids.length === 0) return `${header}export const fits = {};\n`;
  const lines = ids.map((id) => {
    const b = fits[id] as Box;
    return `  "${id}": { x: ${b.x}, y: ${b.y}, width: ${b.width}, height: ${b.height} },`;
  });
  return `${header}export const fits = {\n${lines.join("\n")}\n};\n`;
}

/** The source of `fit-masks.ts`, for the pictures with a mask. */
export function fitMasksSource(ids: string[]): string {
  const doc =
    "/** Each picture's mask, where parts of it have been blocked out. */\n";
  const open = "export const fitMaskUrls: Record<string, string> = {";
  if (ids.length === 0) return `${header}${doc}${open}};\n`;
  const lines = [...ids].sort().map((id) => {
    // As the formatter lays it out, so a save never leaves it complaining.
    const url = `new URL("../art/masks/${id}.png", import.meta.url)`;
    const start = `  "${id}": ${url}`;
    if (`${start}.href,`.length <= 80) return `${start}.href,`;
    if (start.length <= 80) return `${start}\n    .href,`;
    return `  "${id}": new URL(\n    "../art/masks/${id}.png",\n    import.meta.url,\n  ).href,`;
  });
  return `${header}${doc}${open}\n${lines.join("\n")}\n};\n`;
}
