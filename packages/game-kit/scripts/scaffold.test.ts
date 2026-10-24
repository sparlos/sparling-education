import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { scaffold } from "./scaffold.ts";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

/** A repo with the real play registry and a game with a spec. */
function fakeRepo(spec: string) {
  const root = mkdtempSync(join(tmpdir(), "game-kit-"));
  mkdirSync(join(root, "apps", "play", "src"), { recursive: true });
  for (const file of ["package.json", "src/games.ts"])
    cpSync(
      join(repoRoot, "apps", "play", file),
      join(root, "apps", "play", file),
    );
  mkdirSync(join(root, "games", "star-count"), { recursive: true });
  writeFileSync(join(root, "games", "star-count", "SPEC.md"), spec);
  return root;
}

const approved = `# Star Count

Status: approved
Slug: star-count (game link: /play/star-count)
`;

describe("scaffold", () => {
  it("copies the template beside the spec, renamed", () => {
    const root = fakeRepo(approved);
    const { dir, files } = scaffold(root, "star-count");
    assert.ok(files.includes("package.json"));
    assert.ok(files.includes("src/game/StarCount.tsx"));
    assert.ok(!files.some((f) => /template/i.test(f)));
    assert.equal(readFileSync(join(dir, "SPEC.md"), "utf8"), approved);
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    assert.equal(pkg.name, "@games/star-count");
    const manifest = readFileSync(join(dir, "src", "manifest.ts"), "utf8");
    assert.match(manifest, /slug: "star-count"/);
    const index = readFileSync(join(dir, "src", "index.tsx"), "utf8");
    assert.match(
      index,
      /import \{ StarCount \} from "\.\/game\/StarCount\.tsx"/,
    );
    for (const file of files)
      assert.doesNotMatch(
        readFileSync(join(dir, file), "utf8"),
        /template-game|TemplateGame|Template Game/,
        file,
      );
  });

  it("registers the game in the play shell with its voice lines", () => {
    const root = fakeRepo(approved);
    scaffold(root, "star-count");
    const registry = readFileSync(join(root, "apps/play/src/games.ts"), "utf8");
    assert.match(
      registry,
      /"star-count": hosted\(\n {4}\(\) => import\("@games\/star-count"\),\n {4}\(\) => import\("virtual:voice-lines\/star-count"\),\n {2}\),/,
    );
    const pkg = JSON.parse(
      readFileSync(join(root, "apps/play/package.json"), "utf8"),
    );
    assert.equal(pkg.dependencies["@games/star-count"], "workspace:*");
  });

  it("refuses without an approved spec, or over an existing game", () => {
    assert.throws(
      () => scaffold(fakeRepo(approved), "no-spec"),
      /run design-game first/,
    );
    assert.throws(
      () =>
        scaffold(fakeRepo(approved.replace("approved", "draft")), "star-count"),
      /isn't approved/,
    );
    const root = fakeRepo(approved);
    scaffold(root, "star-count");
    assert.throws(
      () => scaffold(root, "star-count"),
      /already has a package.json/,
    );
    assert.ok(existsSync(join(root, "games", "star-count", "package.json")));
  });
});
