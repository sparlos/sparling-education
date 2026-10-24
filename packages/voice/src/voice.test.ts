import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  AUDIO_FORMAT,
  checkStale,
  discoverSources,
  generate,
  lineHash,
  loadVoice,
  type SynthRequest,
  type SynthWorker,
  sha256Hex,
  type VoiceSource,
  writeReviewPage,
} from "./index.ts";

let root: string;
let requests: SynthRequest[];
let strings: Record<string, string>;

// Stands in for `uv run synth`: writes a placeholder file per line.
const fakeWorker: SynthWorker = async (request) => {
  requests.push(request);
  for (const line of request.lines) {
    writeFileSync(line.outPath, `${line.text}@${line.speed}`);
  }
};

const source = (): VoiceSource => ({
  name: "fixture",
  dir: join(root, "games", "fixture"),
  strings,
});
const audio = (id: string) =>
  join(root, "games", "fixture", "voice", "en-CA", `${id}.mp3`);
const lock = () =>
  JSON.parse(
    readFileSync(
      join(root, "games", "fixture", "voice", "voice.lock.json"),
      "utf8",
    ),
  );
const spoken = () => requests.flatMap((r) => r.lines.map((l) => l.text));
const writeOverrides = (overrides: object) => {
  mkdirSync(join(root, "games", "fixture", "voice"), { recursive: true });
  writeFileSync(
    join(root, "games", "fixture", "voice", "overrides.json"),
    JSON.stringify(overrides),
  );
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "voice-"));
  requests = [];
  strings = {
    intro: "Hop to the half.",
    "amount.3-4": "three fourths",
    done: "All done!",
  };
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

test("sha256Hex matches node's sha256", () => {
  for (const text of ["", "abc", "x".repeat(55), "x".repeat(64), "½ pé 🐸"]) {
    assert.equal(
      sha256Hex(text),
      createHash("sha256").update(text).digest("hex"),
    );
  }
});

test("the narrator voice is Kokoro af_heart", () => {
  const voice = loadVoice("narrator");
  assert.equal(voice.model, "mlx-community/Kokoro-82M-8bit");
  assert.equal(voice.voice, "af_heart");
  assert.equal(voice.langCode, "a");
  assert.equal(voice.speed, 0.9);
});

test("first run generates every line and writes the lockfile", async () => {
  const [result] = await generate([source()], fakeWorker);
  assert.equal(result?.generated.length, 3);
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0]?.voice, {
    model: "mlx-community/Kokoro-82M-8bit",
    voice: "af_heart",
    langCode: "a",
  });
  assert.equal(readFileSync(audio("intro"), "utf8"), "Hop to the half.@0.9");
  const voice = loadVoice("narrator");
  assert.deepEqual(lock(), {
    version: 1,
    voice: "narrator",
    lines: {
      "en-CA": {
        "amount.3-4": lineHash(voice, "three fourths", voice.speed),
        done: lineHash(voice, "All done!", voice.speed),
        intro: lineHash(voice, "Hop to the half.", voice.speed),
      },
    },
  });
});

test("an unchanged rerun does no work and leaves files alone", async () => {
  await generate([source()], fakeWorker);
  const before = readFileSync(
    join(root, "games/fixture/voice/voice.lock.json"),
  );
  requests = [];
  const [result] = await generate([source()], fakeWorker);
  assert.equal(requests.length, 0);
  assert.equal(result?.unchanged, 3);
  assert.deepEqual(
    readFileSync(join(root, "games/fixture/voice/voice.lock.json")),
    before,
  );
});

test("a changed string regenerates only that line", async () => {
  await generate([source()], fakeWorker);
  requests = [];
  strings = { ...strings, done: "Well done!" };
  await generate([source()], fakeWorker);
  assert.deepEqual(spoken(), ["Well done!"]);
  assert.equal(readFileSync(audio("done"), "utf8"), "Well done!@0.9");
});

test("a new string is generated", async () => {
  await generate([source()], fakeWorker);
  requests = [];
  strings = { ...strings, extra: "Try again." };
  await generate([source()], fakeWorker);
  assert.deepEqual(spoken(), ["Try again."]);
});

test("a missing file is regenerated", async () => {
  await generate([source()], fakeWorker);
  rmSync(audio("intro"));
  requests = [];
  await generate([source()], fakeWorker);
  assert.deepEqual(spoken(), ["Hop to the half."]);
});

test("an orphaned line's file and lock entry are deleted", async () => {
  await generate([source()], fakeWorker);
  const { done: _, ...rest } = strings;
  strings = rest as Record<string, string>;
  requests = [];
  const [result] = await generate([source()], fakeWorker);
  assert.equal(requests.length, 0);
  assert.deepEqual(result?.removed, ["done"]);
  assert.equal(existsSync(audio("done")), false);
  assert.equal("done" in lock().lines["en-CA"], false);
});

test("a per-line override touches only its line, never the caption", async () => {
  await generate([source()], fakeWorker);
  requests = [];
  writeOverrides({ "amount.3-4": { speed: 0.9, text: "three, fourths" } });
  await generate([source()], fakeWorker);
  assert.deepEqual(
    requests[0]?.lines.map((l) => [l.text, l.speed]),
    [["three, fourths", 0.9]],
  );
  assert.equal(strings["amount.3-4"], "three fourths");
});

test("a speed-only override keeps the caption as the text", async () => {
  writeOverrides({ done: { speed: 0.8 } });
  await generate([source()], fakeWorker);
  const done = requests[0]?.lines.find((l) => l.text === "All done!");
  assert.equal(done?.speed, 0.8);
});

test("removing an override regenerates the line back", async () => {
  writeOverrides({ done: { text: "All done." } });
  await generate([source()], fakeWorker);
  requests = [];
  writeOverrides({});
  await generate([source()], fakeWorker);
  assert.deepEqual(spoken(), ["All done!"]);
});

test("a pronunciation change touches only lines it affects, never captions", async () => {
  const voicesDir = join(root, "voices");
  mkdirSync(join(voicesDir, "narrator"), { recursive: true });
  const base = JSON.parse(
    readFileSync(
      new URL("../voices/narrator/voice.json", import.meta.url),
      "utf8",
    ),
  );
  const write = (pronunciations: object) =>
    writeFileSync(
      join(voicesDir, "narrator", "voice.json"),
      JSON.stringify({ ...base, pronunciations }),
    );
  const { planLines } = await import("./index.ts");
  write({});
  const before = planLines(source(), loadVoice("narrator", voicesDir));
  write({ fourths: "forths" });
  const after = planLines(source(), loadVoice("narrator", voicesDir));
  const changed = after.filter((l, i) => l.hash !== before[i]?.hash);
  assert.deepEqual(
    changed.map((l) => l.id),
    ["amount.3-4"],
  );
  assert.equal(changed[0]?.text, "three forths");
  assert.equal(changed[0]?.caption, "three fourths");
});

test("pronunciation substitutions apply in one pass, longest key first", async () => {
  const { pronounce } = await import("./index.ts");
  assert.equal(
    pronounce("Pip eats Pippa's pie", { Pip: "[Pip](/pɪp/)", Pippa: "Pea-pa" }),
    "[Pip](/pɪp/) eats Pea-pa's pie",
  );
});

test("a failed worker leaves lines stale, not wrong", async () => {
  await generate([source()], fakeWorker);
  strings = { ...strings, done: "Well done!" };
  const silent: SynthWorker = async () => {};
  await assert.rejects(generate([source()], silent), /no file for done/);
  assert.deepEqual(checkStale([source()]).problems, [
    { source: "fixture", id: "done", kind: "changed" },
  ]);
  assert.equal(existsSync(audio("done")), false);
  assert.equal(readFileSync(audio("intro"), "utf8"), "Hop to the half.@0.9");
});

test("the stale check's verdicts", async () => {
  assert.deepEqual(
    checkStale([source()]).problems.map((p) => p.kind),
    ["new", "new", "new"],
  );
  await generate([source()], fakeWorker);
  assert.deepEqual(checkStale([source()]), { ok: true, problems: [] });

  strings = { ...strings, done: "Well done!" };
  assert.deepEqual(checkStale([source()]).problems, [
    { source: "fixture", id: "done", kind: "changed" },
  ]);
  strings = { ...strings, done: "All done!" };

  rmSync(audio("intro"));
  assert.deepEqual(checkStale([source()]).problems, [
    { source: "fixture", id: "intro", kind: "missing-file" },
  ]);
  writeFileSync(audio("intro"), "x");

  writeFileSync(audio("ghost"), "x");
  assert.deepEqual(checkStale([source()]).problems, [
    { source: "fixture", id: "ghost", kind: "orphan-file" },
  ]);
  rmSync(audio("ghost"));

  const { ...fewer } = strings;
  delete fewer.done;
  strings = fewer;
  assert.deepEqual(checkStale([source()]).problems, [
    { source: "fixture", id: "done", kind: "orphan-file" },
    { source: "fixture", id: "done", kind: "orphan-lock" },
  ]);
});

test("string IDs that can't be file names are rejected", async () => {
  strings = { "../evil": "x" };
  await assert.rejects(generate([source()], fakeWorker), /file name/);
});

test("discovery finds games with manifests and tolerates none", async () => {
  assert.deepEqual(await discoverSources(root), []);
  mkdirSync(join(root, "games", "empty"), { recursive: true });
  assert.deepEqual(await discoverSources(root), []);
  const src = join(root, "games", "fixture", "src");
  mkdirSync(src, { recursive: true });
  writeFileSync(
    join(src, "manifest.ts"),
    `export const manifest = { strings: { "en-CA": { hi: "Hello" }, "fr-CA": { hi: "Bonjour" } } };\n`,
  );
  assert.deepEqual(await discoverSources(root), [
    {
      name: "fixture",
      dir: join(root, "games", "fixture"),
      strings: { hi: "Hello" },
    },
  ]);
});

test("the review page lists only the lines that changed", async () => {
  await generate([source()], fakeWorker);
  strings = { ...strings, done: "Well <done>!" };
  const results = await generate([source()], fakeWorker);
  const file = join(root, "review", "index.html");
  assert.equal(writeReviewPage(results, file), true);
  const html = readFileSync(file, "utf8");
  assert.match(html, /Well &lt;done&gt;!/);
  assert.doesNotMatch(html, /Hop to the half/);
  assert.match(html, /\.\.\/games\/fixture\/voice\/en-CA\/done\.mp3/);

  const none = await generate([source()], fakeWorker);
  assert.equal(writeReviewPage(none, join(root, "none.html")), false);
  assert.equal(readdirSync(root).includes("none.html"), false);
});

test("the audio format is part of every line's hash", () => {
  const { model, voice, langCode } = loadVoice("narrator");
  const withFormat = (format: string) =>
    sha256Hex(
      JSON.stringify({ model, voice, langCode, text: "Hi", speed: 1, format }),
    ).slice(0, 16);
  assert.equal(
    lineHash({ model, voice, langCode }, "Hi", 1),
    withFormat(AUDIO_FORMAT),
  );
  assert.notEqual(withFormat(AUDIO_FORMAT), withFormat("other"));
});

test("check-voice CLI passes with no games, lists stale IDs and exits non-zero", async () => {
  const script = fileURLToPath(new URL("../scripts/check.ts", import.meta.url));
  const run = () =>
    spawnSync(process.execPath, [script, "--root", root], {
      encoding: "utf8",
    });

  const none = run();
  assert.equal(none.status, 0);
  assert.match(none.stdout, /up to date/);

  const src = join(root, "games", "fixture", "src");
  mkdirSync(src, { recursive: true });
  const manifest = (done: string) =>
    `export const manifest = { strings: { "en-CA": { intro: "Hop to the half.", done: ${JSON.stringify(done)} } } };\n`;
  writeFileSync(join(src, "manifest.ts"), manifest("All done!"));
  strings = { intro: "Hop to the half.", done: "All done!" };
  await generate([source()], fakeWorker);
  assert.equal(run().status, 0);

  writeFileSync(join(src, "manifest.ts"), manifest("Well done!"));
  const stale = run();
  assert.equal(stale.status, 1);
  const lines = stale.stderr.trim().split("\n");
  assert.deepEqual(lines, [
    "fixture: done (changed)",
    "voice lines stale, run `pnpm voice`",
  ]);
});
