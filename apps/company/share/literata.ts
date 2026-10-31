import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The page's Literata is a variable woff2, which the image renderer can't
// read, so generated images use Fontsource's static cut of the same face.
export async function literata(weight: 400 | 500 | 600) {
  return {
    name: "Literata",
    weight,
    style: "normal" as const,
    data: await readFile(
      join(
        process.cwd(),
        `node_modules/@fontsource/literata/files/literata-latin-${weight}-normal.woff`,
      ),
    ),
  };
}
