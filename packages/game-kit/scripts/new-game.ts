// pnpm new-game <slug>
//
// Starts a game from the starter kit's template, in games/<slug>/, next to
// the approved SPEC.md that `design-game` wrote there. Registers it in
// apps/play with its voice-line map. Then prints what to do next.
import { fileURLToPath } from "node:url";
import { scaffold } from "./scaffold.ts";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const slug = process.argv[2];
if (!slug) {
  console.error("usage: pnpm new-game <slug>");
  process.exit(2);
}
try {
  const { dir, files } = scaffold(root, slug);
  console.log(`Made ${dir}:\n${files.map((f) => `  ${f}`).join("\n")}`);
  console.log(`Registered @games/${slug} in apps/play (src/games.ts, package.json).

Next:
1. pnpm install (on the host, not in the sandbox).
2. Replace the template's example: manifest.ts, strings.ts, rules/ and game/
   from SPEC.md. spec.test.ts fails until the manifest matches the spec.
3. pnpm --filter @games/${slug} test, then pnpm tour ${slug} and
   pnpm mutate ${slug} (update tour.ts and mutations.ts for the real game).
4. pnpm voice on the Mac for the voice lines; restart the dev server after
   the first run.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
