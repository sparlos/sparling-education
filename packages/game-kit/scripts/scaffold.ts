// Makes a new game package from the template, next to the approved SPEC.md
// its `design-game` session wrote, and registers it in the play shell with
// its voice-line map. See scripts/new-game.ts.
import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const templateDir = fileURLToPath(
  new URL("../template", import.meta.url),
);

/** Template names, replaced in every file and file name. */
const placeholders = {
  slug: "template-game",
  component: "TemplateGame",
  title: "Template Game",
};

export interface Scaffolded {
  dir: string;
  files: string[];
}

export function scaffold(root: string, slug: string): Scaffolded {
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(slug))
    throw new Error(
      `"${slug}" isn't a slug: lowercase words joined by hyphens`,
    );
  const dir = join(root, "games", slug);
  const specFile = join(dir, "SPEC.md");
  if (!existsSync(specFile))
    throw new Error(
      `${specFile} doesn't exist. A game is built from an approved spec: run design-game first.`,
    );
  const spec = readFileSync(specFile, "utf8");
  if (!/^Status: approved$/m.test(spec))
    throw new Error(`${specFile} isn't approved ("Status: approved").`);
  const specSlug = /^Slug: (\S+)/m.exec(spec)?.[1];
  if (specSlug !== slug)
    throw new Error(`${specFile} says "Slug: ${specSlug}", not ${slug}.`);
  if (existsSync(join(dir, "package.json")))
    throw new Error(`${dir} already has a package.json.`);
  const title = /^# (.+)$/m.exec(spec)?.[1]?.trim() ?? slug;
  const names = {
    slug,
    title,
    component: title
      .replace(/[^A-Za-z0-9]+/g, " ")
      .replace(/(?:^| )(\w)/g, (_, c: string) => c.toUpperCase()),
  };
  if (!/^[A-Z]\w*$/.test(names.component))
    throw new Error(`Can't make a component name from the title "${title}".`);

  cpSync(templateDir, dir, {
    recursive: true,
    // The game keeps its own spec.
    filter: (src) => src !== join(templateDir, "SPEC.md"),
  });
  const files: string[] = [];
  const rename = (path: string) => {
    let renamed = path.replaceAll(placeholders.component, names.component);
    if (renamed.endsWith("package.json.template"))
      renamed = renamed.replace(/\.template$/, "");
    if (renamed !== path) renameSync(path, renamed);
    return renamed;
  };
  const walk = (at: string) => {
    for (const entry of readdirSync(at)) {
      const path = rename(join(at, entry));
      if (statSync(path).isDirectory()) walk(path);
      else {
        const text = readFileSync(path, "utf8");
        writeFileSync(
          path,
          text
            .replaceAll(placeholders.slug, names.slug)
            .replaceAll(placeholders.component, names.component)
            .replaceAll(placeholders.title, names.title),
        );
        files.push(path.slice(dir.length + 1));
      }
    }
  };
  walk(dir);
  register(root, slug);
  return { dir, files: files.sort() };
}

/**
 * Adds the game to the play shell: a dependency of apps/play, and an entry
 * in its registry that loads the game with its voice-line map from
 * `@repo/voice/vite` (`virtual:voice-lines/<slug>`), so recorded lines play
 * once `pnpm voice` has made them, and browser speech speaks the rest.
 */
export function register(root: string, slug: string) {
  const pkgFile = join(root, "apps", "play", "package.json");
  const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
  const name = `@games/${slug}`;
  pkg.dependencies = Object.fromEntries(
    Object.entries({ ...pkg.dependencies, [name]: "workspace:*" }).sort(
      ([a], [b]) => (a < b ? -1 : 1),
    ),
  );
  writeFileSync(pkgFile, `${JSON.stringify(pkg, null, 2)}\n`);

  const registryFile = join(root, "apps", "play", "src", "games.ts");
  const registry = readFileSync(registryFile, "utf8");
  if (registry.includes(`import("${name}")`)) return;
  const anchor = "export const games: GameRegistry = {\n";
  if (!registry.includes(anchor))
    throw new Error(
      `${registryFile} has no "${anchor.trim()}" to add the game to.`,
    );
  const entry = `  "${slug}": hosted(\n    () => import("${name}"),\n    () => import("virtual:voice-lines/${slug}"),\n  ),\n`;
  writeFileSync(registryFile, registry.replace(anchor, anchor + entry));
}
