import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { build } from "vite";
import {
  currentLineFiles,
  linePath,
  loadVoice,
  planLines,
  type VoiceSource,
} from "./index.ts";
import { voiceLines } from "./vite.ts";

let root: string;
let strings: Record<string, string>;

const gameDir = () => join(root, "games", "demo");
const source = (): VoiceSource => ({ name: "demo", dir: gameDir(), strings });

/** Writes a file and lockfile as `pnpm voice` would, for the given strings. */
function record(
  recorded: Record<string, string>,
  files = Object.keys(recorded),
) {
  const voice = loadVoice("narrator");
  const hashes: Record<string, string> = {};
  for (const line of planLines({ ...source(), strings: recorded }, voice)) {
    hashes[line.id] = line.hash;
  }
  mkdirSync(join(gameDir(), "voice", "en-CA"), { recursive: true });
  for (const id of files) writeFileSync(linePath(source(), id), `mp3 ${id}`);
  writeFileSync(
    join(gameDir(), "voice", "voice.lock.json"),
    JSON.stringify({
      version: 1,
      voice: "narrator",
      lines: { "en-CA": hashes },
    }),
  );
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "linemap-"));
  strings = { intro: "Hop to the half.", done: "All done!" };
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

test("lines that match their lockfile hash and have a file are current", () => {
  record(strings);
  assert.deepEqual(currentLineFiles(source()), {
    intro: linePath(source(), "intro"),
    done: linePath(source(), "done"),
  });
});

test("a line whose text changed is left out", () => {
  record(strings);
  strings = { ...strings, intro: "Hop to the other half." };
  assert.deepEqual(Object.keys(currentLineFiles(source())), ["done"]);
});

test("a line with no file, and a line not in the lockfile, are left out", () => {
  record(strings, ["done"]);
  strings = { ...strings, extra: "New line." };
  assert.deepEqual(Object.keys(currentLineFiles(source())), ["done"]);
});

test("an orphaned file or lock entry never appears", () => {
  record({ ...strings, gone: "Removed string." });
  assert.deepEqual(Object.keys(currentLineFiles(source())).sort(), [
    "done",
    "intro",
  ]);
});

test("no lockfile means no lines", () => {
  assert.deepEqual(currentLineFiles(source()), {});
});

test("a production build emits current audio, fingerprinted, in the game's chunk", async () => {
  writeFileSync(join(root, "package.json"), '{ "type": "module" }');
  record({ ...strings, tiny: "Hi." });
  // The plugin reads the strings from the game's manifest.
  mkdirSync(join(gameDir(), "src"), { recursive: true });
  writeFileSync(
    join(gameDir(), "src", "manifest.ts"),
    `export const manifest = { strings: { "en-CA": ${JSON.stringify({
      ...strings,
      tiny: "Hi. Changed.",
      fresh: "Never recorded.",
    })} } };`,
  );
  writeFileSync(
    join(root, "shell.js"),
    `import("virtual:voice-lines/demo").then((m) => console.log(m.default));`,
  );

  const result = await build({
    root,
    logLevel: "silent",
    configFile: false,
    plugins: [voiceLines({ root })],
    build: {
      outDir: join(root, "dist"),
      write: false,
      assetsInlineLimit: 1_000_000, // would inline tiny files without ?no-inline
      rollupOptions: { input: join(root, "shell.js") },
    },
  });
  const output = (Array.isArray(result) ? result[0] : result) as unknown as {
    output: { type: string; fileName: string; code?: string }[];
  };
  const files = output.output;
  const chunks = files.filter((f) => f.type === "chunk");
  const mp3s = files.filter((f) => f.fileName.endsWith(".mp3"));

  // intro and done are current; tiny is stale and fresh was never recorded.
  assert.equal(mp3s.length, 2);
  for (const mp3 of mp3s) assert.match(mp3.fileName, /-[\w-]{8}\.mp3$/);
  const entry = chunks.find((c) => c.code?.includes("import("));
  const game = chunks.find((c) => c.code?.includes(".mp3"));
  assert.ok(entry && game && entry !== game, "the map is a separate chunk");
  assert.doesNotMatch(entry.code ?? "", /\.mp3/);
  assert.doesNotMatch(game.code ?? "", /tiny|fresh/);
  assert.match(game.code ?? "", /intro/);
  assert.match(game.code ?? "", /done/);
});
