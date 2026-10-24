// A local page for listening to the lines a run changed. Never committed.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { SourceResult } from "./generate.ts";
import { linePath } from "./lines.ts";

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
  );

/** Writes the page to `file` and returns whether it had any lines to list. */
export function writeReviewPage(
  results: SourceResult[],
  file: string,
): boolean {
  const sections = results
    .filter((result) => result.generated.length > 0)
    .map(({ source, generated }) => {
      const rows = generated
        .map(({ kind, line }) => {
          const src = relative(dirname(file), linePath(source, line.id))
            .split("/")
            .map(encodeURIComponent)
            .join("/");
          const spoken =
            line.text === line.caption
              ? ""
              : `<p class="spoken">Spoken as: ${escapeHtml(line.text)}</p>`;
          return `<li><p><code>${escapeHtml(line.id)}</code> <small>${kind}, speed ${line.speed}</small></p><p>${escapeHtml(line.caption)}</p>${spoken}<audio controls preload="none" src="${src}"></audio></li>`;
        })
        .join("\n");
      return `<h2>${escapeHtml(source.name)}</h2>\n<ul>\n${rows}\n</ul>`;
    });
  if (sections.length === 0) return false;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    `<!doctype html>
<meta charset="utf-8">
<title>Voice lines changed</title>
<style>body{font:16px system-ui;max-width:42rem;margin:2rem auto;padding:0 1rem}li{margin:1rem 0;list-style:none}p{margin:.25rem 0}.spoken,small{color:#666}</style>
<h1>Voice lines changed</h1>
${sections.join("\n")}
`,
  );
  return true;
}

export const reviewFile = (root: string) =>
  join(root, "packages", "voice", ".review", "index.html");
