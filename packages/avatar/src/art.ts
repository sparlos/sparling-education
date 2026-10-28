// Each shape's layer PNG URLs, for the browser. Kept apart from ./parts.ts so
// the API never resolves art.
import { sheetShapeUrls } from "./generated/shape-urls.ts";
import type { Layer, ShapeId } from "./parts.ts";

export function layerUrls(shape: ShapeId): Partial<Record<Layer, string>> {
  const urls = sheetShapeUrls[shape];
  if (!urls) throw new Error(`No art for avatar shape ${shape}`);
  return urls;
}
