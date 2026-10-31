// Writes every logo file from the brand name and the mark's geometry:
// SVG logos and tiles into assets/, PNG app icons, and each app's favicons.
// The wordmark is Plus Jakarta Sans ExtraBold turned into outlines, so the
// files render anywhere without the font. Run after changing `brandName`:
//
//   pnpm --filter @repo/brand logos
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brandByline, brandName, color, palette } from "@repo/tokens";
import {
  gemBox,
  gemFacets,
  gemOutline,
  gemSeams,
  markBox,
  sparkleGapStroke,
  sparkleOutline,
} from "@repo/tokens/mark";
import opentype, { type Font } from "opentype.js";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const assets = join(here, "..", "assets");
const require = createRequire(import.meta.url);

function loadFont(weight: 500 | 800): Font {
  const file = require.resolve(
    `@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-${weight}-normal.woff`,
  );
  const bytes = readFileSync(file);
  return opentype.parse(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}
const extraBold = loadFont(800);
const medium = loadFont(500);

const ink = palette.slate[9];
const lavender = palette.violet[1];
const bylineOnLight = palette.slate[6];
const bylineOnDark = "rgba(255, 255, 255, 0.72)";

const r2 = (n: number) => Math.round(n * 100) / 100;

let nextId = 0;

type MarkStyle = "colour" | "mono";

/** The mark with its gem `height` px tall, the gem's top-left at (x, y). */
function mark(x: number, y: number, height: number, style: MarkStyle): string {
  const id = `m${nextId++}`;
  const scale = r2((height / gemBox.height) * 1000) / 1000;
  const seams =
    style === "mono"
      ? `<path d="${gemSeams}" fill="none" stroke="#000" stroke-width="3" stroke-linejoin="round"/>`
      : "";
  const cut = `<mask id="${id}-cut" maskUnits="userSpaceOnUse" x="-10" y="-40" width="160" height="150"><path d="${gemOutline}" fill="#fff"/>${seams}<path d="${sparkleOutline}" fill="#000" stroke="#000" stroke-width="${sparkleGapStroke}" stroke-linejoin="round"/></mask>`;
  const gem =
    style === "mono"
      ? `<path d="${gemOutline}" fill="#fff"/>`
      : `<clipPath id="${id}-clip"><path d="${gemOutline}"/></clipPath><g clip-path="url(#${id}-clip)">${gemFacets
          .map((f) => `<path d="${f.d}" fill="${f.fill}"/>`)
          .join("")}</g>`;
  const sparkleFill = style === "mono" ? "#fff" : color.sparkle;
  return `<g transform="translate(${r2(x)} ${r2(y)}) scale(${scale})">${cut}<g mask="url(#${id}-cut)">${gem}</g><path d="${sparkleOutline}" fill="${sparkleFill}"/></g>`;
}

/** Text as outlines, with tracking in ems. Returns the path and its width. */
function outlined(
  font: Font,
  text: string,
  x: number,
  baseline: number,
  size: number,
  fill: string,
  tracking = 0,
) {
  const glyphs = font.stringToGlyphs(text);
  let d = "";
  let cursor = x;
  glyphs.forEach((glyph, i) => {
    d += glyph.getPath(cursor, baseline, size).toPathData(2);
    if (i === glyphs.length - 1) {
      cursor += (glyph.advanceWidth / font.unitsPerEm) * size;
      return;
    }
    const next = glyphs[i + 1];
    const kern = next ? font.getKerningValue(glyph, next) : 0;
    cursor +=
      ((glyph.advanceWidth + kern) / font.unitsPerEm) * size + tracking * size;
  });
  return { svg: `<path d="${d}" fill="${fill}"/>`, width: cursor - x };
}

type Theme = "light" | "dark" | "mono";

/** The full horizontal logo, sized so the wordmark's caps are 100 px tall. */
function logo(theme: Theme, withByline: boolean) {
  const cap = 100;
  const capRatio = extraBold.tables.os2.sCapHeight / extraBold.unitsPerEm;
  const fontSize = cap / capRatio;
  const gemHeight = cap * 1.3;
  const scale = gemHeight / gemBox.height;
  const top = -markBox.y * scale; // room for the sparkle above the gem
  const baseline = top + cap; // caps start level with the gem's top
  const textX = markBox.width * scale + cap * 0.3;
  const wordFill = theme === "light" ? ink : "#FFFFFF";
  const word = outlined(
    extraBold,
    brandName,
    textX,
    baseline,
    fontSize,
    wordFill,
    -0.025,
  );
  let height = Math.max(top + gemHeight, baseline + fontSize * 0.08);
  let byline = "";
  if (withByline) {
    const size = cap * 0.34;
    const bylineBaseline = baseline + cap * 0.62;
    const fill = theme === "light" ? bylineOnLight : bylineOnDark;
    // Nudged right so it lines up with the first letter's stem.
    byline = outlined(
      medium,
      brandByline,
      textX + cap * 0.04,
      bylineBaseline,
      size,
      fill,
      0.01,
    ).svg;
    height = Math.max(height, bylineBaseline + size * 0.25);
  }
  const width = r2(textX + word.width + 4);
  height = r2(height + 4);
  const markStyle: MarkStyle = theme === "mono" ? "mono" : "colour";
  return svg(
    width,
    height,
    `${mark(0, top, gemHeight, markStyle)}${word.svg}${byline}`,
  );
}

/** The mark on its own, sparkle included. */
function markOnly(style: MarkStyle) {
  const pad = 2;
  return svg(
    markBox.width + pad * 2,
    markBox.height + pad * 2,
    mark(pad, pad - markBox.y, gemBox.height, style),
  );
}

/** An app tile: the gem centred on a rounded square, sparkle on its corner. */
function tile(theme: "dark" | "light") {
  const size = 1024;
  const background = theme === "dark" ? ink : lavender;
  const gemHeight = size * 0.46;
  const scale = gemHeight / gemBox.height;
  const x = (size - gemBox.width * scale) / 2;
  const y = (size - gemBox.height * scale) / 2;
  return svg(
    size,
    size,
    `<rect width="${size}" height="${size}" rx="${size * 0.225}" fill="${background}"/>${mark(x, y, gemHeight, "colour")}`,
  );
}

function svg(width: number, height: number, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img"><title>${brandName}</title>${body}</svg>\n`;
}

/** A .ico holding PNG images, one per size. */
function ico(pngs: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + pngs.length * 16;
  const entries = pngs.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

const png = (source: string, size: number) =>
  sharp(Buffer.from(source)).resize(size, size).png().toBuffer();

function write(path: string, data: string | Buffer) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  console.log(`  ${path.slice(root.length + 1)}`);
}

console.log(`Logo files for "${brandName}":`);

for (const theme of ["light", "dark", "mono"] as const) {
  write(join(assets, `logo-${theme}.svg`), logo(theme, false));
  write(join(assets, `logo-${theme}-byline.svg`), logo(theme, true));
}
write(join(assets, "mark.svg"), markOnly("colour"));
write(join(assets, "mark-mono.svg"), markOnly("mono"));

const darkTile = tile("dark");
write(join(assets, "tile-dark.svg"), darkTile);
write(join(assets, "tile-light.svg"), tile("light"));
for (const size of [1024, 512, 256, 128, 64]) {
  write(join(assets, `tile-dark-${size}.png`), await png(darkTile, size));
}

// Favicons: Next's app-directory files for the site, public/ for the Vite apps.
const favicon = ico(
  await Promise.all(
    [16, 32, 48].map(async (size) => ({
      size,
      data: await png(darkTile, size),
    })),
  ),
);
const touchIcon = await png(darkTile, 180);
write(join(root, "apps/web/app/favicon.ico"), favicon);
write(join(root, "apps/web/app/icon.svg"), darkTile);
write(join(root, "apps/web/app/apple-icon.png"), touchIcon);
for (const app of ["teach", "play"]) {
  write(join(root, `apps/${app}/public/favicon.ico`), favicon);
  write(join(root, `apps/${app}/public/icon.svg`), darkTile);
  write(join(root, `apps/${app}/public/apple-touch-icon.png`), touchIcon);
}
