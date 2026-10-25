// The render step: bundles the Remotion project and renders one brief's
// composition to out/<id>.mp4 (H.264, the mix as AAC).
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { webpackOverride } from "../webpack-override.ts";
import { chromePath, gl } from "./chrome.ts";
import { paths } from "./files.ts";

export async function render(
  id: string,
  {
    stills = [] as number[],
    frames,
  }: { stills?: number[]; frames?: [number, number] } = {},
) {
  const p = paths(id);
  const serveUrl = await bundle({
    entryPoint: join(p.root, "src", "index.ts"),
    publicDir: join(p.root, "public"),
    webpackOverride,
  });
  const browserExecutable = chromePath() ?? null;
  const chromiumOptions = { gl };
  const composition = await selectComposition({
    serveUrl,
    id,
    inputProps: {},
    browserExecutable,
    chromiumOptions,
  });
  mkdirSync(dirname(p.out), { recursive: true });
  if (stills.length) {
    for (const frame of stills) {
      const output = join(dirname(p.out), `${id}-${frame}.png`);
      await renderStill({
        serveUrl,
        composition,
        frame,
        output,
        browserExecutable,
        chromiumOptions,
      });
      console.log(`still: ${output}`);
    }
    return;
  }
  let last = -1;
  await renderMedia({
    serveUrl,
    composition,
    codec: "h264",
    crf: 16,
    audioBitrate: "320k",
    outputLocation: p.out,
    browserExecutable,
    chromiumOptions,
    frameRange: frames ?? null,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== last) console.log(`render: ${pct}%`);
      last = pct;
    },
  });
  console.log(`render: ${p.out}`);
}
