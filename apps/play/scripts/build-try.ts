// Builds the try site into out/: bundles it, then writes each page as real
// HTML, because search engines and link previews read a page's HTML rather
// than running it. Run with `pnpm --filter play build:try`.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build, loadEnv } from "vite";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const out = join(appRoot, "out");
const serverOut = join(appRoot, "node_modules/.try-prerender");

const env = { ...loadEnv("try", appRoot), ...process.env };
const siteUrl = env.VITE_TRY_SITE_URL?.replace(/\/+$/, "");
if (!siteUrl) throw new Error("Set VITE_TRY_SITE_URL: see .env.try");
const productSiteUrl = env.VITE_PRODUCT_SITE_URL || undefined;
if (!productSiteUrl)
  console.warn(
    'VITE_PRODUCT_SITE_URL is not set, so the "Learn more" link is left out.',
  );

await build({ root: appRoot, mode: "try" });
await build({
  root: appRoot,
  mode: "try",
  logLevel: "warn",
  build: {
    ssr: "src/try/prerender.tsx",
    outDir: serverOut,
    emptyOutDir: true,
    rollupOptions: { input: "src/try/prerender.tsx" },
  },
});

const { buildSite } = (await import(
  pathToFileURL(join(serverOut, "prerender.js")).href
)) as typeof import("../src/try/prerender.tsx");

/** A JPEG's or PNG's size in pixels, for the tags that make a preview show on its first share. */
function imageSize(
  path: string,
): { width: number; height: number } | undefined {
  const bytes = readFileSync(join(out, path));
  if (bytes.readUInt32BE(0) === 0x89504e47)
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (bytes.readUInt16BE(0) !== 0xffd8) return undefined;
  for (let at = 2; at + 9 < bytes.length; ) {
    const marker = bytes.readUInt8(at + 1);
    // The frame headers that say the size, leaving out the three that aren't.
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker)
    )
      return {
        height: bytes.readUInt16BE(at + 5),
        width: bytes.readUInt16BE(at + 7),
      };
    at += 2 + bytes.readUInt16BE(at + 2);
  }
  return undefined;
}

const { pages, files } = buildSite({
  site: { url: siteUrl, indexable: env.VITE_TRY_INDEXABLE === "true" },
  productSiteUrl,
  size: imageSize,
});

const template = readFileSync(join(out, "try.html"), "utf8");
rmSync(join(out, "try.html"));
const write = (file: string, content: string) => {
  mkdirSync(dirname(join(out, file)), { recursive: true });
  writeFileSync(join(out, file), content);
};
for (const page of pages)
  write(
    page.file,
    template
      .replace("<!--try-head-->", () => page.head)
      .replace("<!--try-page-->", () => page.html),
  );
for (const [file, content] of Object.entries(files)) write(file, content);
rmSync(serverOut, { recursive: true, force: true });
console.log(`Try site: ${pages.length} pages in out/ for ${siteUrl}`);
