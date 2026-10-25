// The music step: renders the brief's Strudel pattern to a WAV, offline
// (faster than real time, and the same every run), in headless Chrome.
//
// Strudel runs from the installed @strudel/web bundle, served locally.
// Samples come from the dirt-samples set on GitHub
// (raw.githubusercontent.com); synths need nothing.
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { chromePath } from "./chrome.ts";

const strudelDist = dirname(fileURLToPath(import.meta.resolve("@strudel/web")));

const page = `<!doctype html><meta charset="utf-8"><body><script type="module">
import * as strudel from "/strudel/index.mjs";
window.strudel = strudel;
window.ready = strudel.initStrudel({
  prebake: () => strudel.samples("github:tidalcycles/dirt-samples"),
});
</script>`;

export interface MusicRequest {
  code: string;
  bpm: number;
  bars: number;
  out: string;
}

export async function renderMusic({ code, bpm, bars, out }: MusicRequest) {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    if (url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html" }).end(page);
      return;
    }
    if (url.pathname.startsWith("/strudel/")) {
      const file = normalize(join(strudelDist, url.pathname.slice(9)));
      if (file.startsWith(strudelDist)) {
        try {
          res
            .writeHead(200, { "content-type": "text/javascript" })
            .end(readFileSync(file));
          return;
        } catch {}
      }
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  const browser = await chromium.launch({
    executablePath: chromePath(),
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  try {
    const tab = await browser.newPage({ acceptDownloads: true });
    const errors: string[] = [];
    tab.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    tab.on("pageerror", (e) => errors.push(e.message));
    await tab.goto(`http://127.0.0.1:${port}/`);
    const download = tab.waitForEvent("download", { timeout: 300_000 });
    await tab.evaluate(
      async ({ code, cps, bars }) => {
        // biome-ignore lint/suspicious/noExplicitAny: Strudel's untyped bundle on window.
        const w = window as any;
        await w.ready;
        const pattern = await w.strudel.evaluate(code, false);
        // Fire and forget: the WAV arrives as a download.
        w.strudel.renderPatternAudio(
          pattern,
          cps,
          0,
          bars,
          48000,
          8192,
          false,
          "bgm",
        );
      },
      { code, cps: bpm / 60 / 4, bars },
    );
    const file = await download;
    await file.saveAs(out);
    // Strudel logs a failed sample load and carries on; fail loudly instead.
    const missing = errors.filter((e) => /sample|sound|not found/i.test(e));
    if (missing.length)
      throw new Error(`strudel: ${[...new Set(missing)].join("\n")}`);
  } finally {
    await browser.close();
    server.close();
  }
}

// `node scripts/music.ts <code-file> <bpm> <bars> <out.wav>`: try a pattern.
if (import.meta.url === `file://${process.argv[1]}`) {
  const [codeFile, bpm, bars, out] = process.argv.slice(2);
  if (!codeFile || !bpm || !bars || !out) {
    console.error(
      "usage: node scripts/music.ts <code.js> <bpm> <bars> <out.wav>",
    );
    process.exit(2);
  }
  await renderMusic({
    code: readFileSync(codeFile, "utf8"),
    bpm: Number(bpm),
    bars: Number(bars),
    out,
  });
  writeFileSync(1, `${out}\n`);
}
