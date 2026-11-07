// Writes every logo file from the brand name and the mark's geometry: the
// name and byline as outlines for the apps, SVG logos and tiles into assets/,
// PNG app icons, and each app's favicons. The name is Poppins ExtraBold and
// the byline Poppins Medium, turned into outlines so nothing has to load the
// font. Run after changing `brandName` or `brandByline`:
//
//   pnpm --filter @repo/brand logos
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { brandByline, brandName, color, palette } from "@repo/tokens";
import {
  type LogoShape,
  logoLayout,
  markBox,
  markGoldRun,
  markParts,
  markSmallStroke,
  markSpine,
  type Outline,
} from "@repo/tokens/mark";
import opentype, { type Font } from "opentype.js";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const assets = join(here, "..", "assets");
const require = createRequire(import.meta.url);

function loadFont(weight: 500 | 800): Font {
  const file = require.resolve(
    `@fontsource/poppins/files/poppins-latin-${weight}-normal.woff`,
  );
  const bytes = readFileSync(file);
  return opentype.parse(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}
const extraBold = loadFont(800);
const medium = loadFont(500);

const r2 = (n: number) => Math.round(n * 100) / 100;

/** `text` as one outline at font size 100, baseline at y 0, kerned. */
function outline(font: Font, text: string): Outline {
  const size = 100;
  const glyphs = font.stringToGlyphs(text);
  let d = "";
  let cursor = 0;
  glyphs.forEach((glyph, i) => {
    d += glyph.getPath(cursor, 0, size).toPathData(2);
    const next = glyphs[i + 1];
    const kern = next ? font.getKerningValue(glyph, next) : 0;
    cursor += ((glyph.advanceWidth + kern) / font.unitsPerEm) * size;
  });
  const scale = size / font.unitsPerEm;
  return {
    d,
    width: r2(cursor),
    capHeight: r2(font.tables.os2.sCapHeight * scale),
    descent: r2(-font.tables.os2.sTypoDescender * scale),
  };
}

const words = {
  name: outline(extraBold, brandName),
  byline: outline(medium, brandByline),
};

/** How a logo file is coloured. */
interface Colours {
  /** Wings and page edges: "gradient" for the logo's gold run, or one colour. */
  gold: string;
  book: string;
  name: string;
  byline: string;
}

const onLight: Colours = {
  gold: "gradient",
  book: color.logo.book,
  name: color.ink.default,
  byline: color.logo.byline,
};
const onDark: Colours = {
  gold: "gradient",
  book: color.logo.bookOnDark,
  name: "#FFFFFF",
  byline: color.logo.bylineOnDark,
};
const allOne = (fill: string): Colours => ({
  gold: fill,
  book: fill,
  name: fill,
  byline: fill,
});

let nextId = 0;

/** The mark at `translate(x y) scale(scale)`; `stroke` thickens it for small sizes. */
function mark(
  x: number,
  y: number,
  scale: number,
  colours: Colours,
  stroke = 0,
): string {
  const id = `k${nextId++}`;
  const { width, height } = markBox;
  const gold = colours.gold === "gradient" ? `url(#${id}-gold)` : colours.gold;
  const defs = [
    colours.gold === "gradient"
      ? `<linearGradient id="${id}-gold" gradientUnits="userSpaceOnUse" x1="${markGoldRun.x1}" y1="${markGoldRun.y1}" x2="${markGoldRun.x2}" y2="${markGoldRun.y2}"><stop offset="0" stop-color="${color.logo.goldLight}"/><stop offset="1" stop-color="${color.logo.gold}"/></linearGradient>`
      : "",
    `<clipPath id="${id}-left"><rect x="-40" y="-40" width="${markSpine.leftEdge + 40}" height="${height + 80}"/></clipPath>`,
    `<clipPath id="${id}-right"><rect x="${markSpine.rightEdge}" y="-40" width="${width - markSpine.rightEdge + 40}" height="${height + 80}"/></clipPath>`,
  ].join("");
  const parts = markParts
    .map((part) => {
      const fill = part.colour === "gold" ? gold : colours.book;
      const clip = part.side ? ` clip-path="url(#${id}-${part.side})"` : "";
      const thick = stroke
        ? ` stroke="${fill}" stroke-width="${stroke}" stroke-linejoin="round" stroke-linecap="round"`
        : "";
      return `<path d="${part.d}" fill="${fill}"${thick}${clip}/>`;
    })
    .join("");
  return `<g transform="translate(${r2(x)} ${r2(y)}) scale(${scale})"><defs>${defs}</defs>${parts}</g>`;
}

const text = (
  o: Outline,
  at: { x: number; y: number; scale: number },
  fill: string,
) =>
  `<path transform="translate(${at.x} ${at.y}) scale(${at.scale})" d="${o.d}" fill="${fill}"/>`;

/** A full logo, `size` px tall (horizontal) or wide (stacked), before padding. */
function logo(
  shape: LogoShape,
  withByline: boolean,
  colours: Colours,
  background?: string,
): string {
  const size = shape === "horizontal" ? 200 : 400;
  const k = size / 100;
  const layout = logoLayout(words, shape, withByline);
  const pad = background ? size * 0.08 : 2;
  const width = r2(layout.width * k + pad * 2);
  const height = r2(layout.height * k + pad * 2);
  const at = (p: { x: number; y: number; scale: number }) => ({
    x: r2(pad + p.x * k),
    y: r2(pad + p.y * k),
    scale: r2(p.scale * k * 100000) / 100000,
  });
  const markAt = at(layout.mark);
  const body = [
    background
      ? `<rect width="${width}" height="${height}" rx="${r2(size * 0.06)}" fill="${background}"/>`
      : "",
    mark(markAt.x, markAt.y, markAt.scale, colours),
    text(words.name, at(layout.name), colours.name),
    layout.byline ? text(words.byline, at(layout.byline), colours.byline) : "",
  ].join("");
  return svg(width, height, body);
}

/** The mark on its own. */
function markOnly(colours: Colours) {
  const pad = 4;
  const scale = 400 / markBox.width;
  return svg(
    r2(400 + pad * 2),
    r2(markBox.height * scale + pad * 2),
    mark(pad, pad, r2(scale * 100000) / 100000, colours),
  );
}

/**
 * An app tile: the mark centred on a rounded square. `small` thickens the
 * mark's strokes for favicons, where the thin ones vanish.
 */
function tile(theme: "dark" | "light", small = false) {
  const size = 1024;
  const background = theme === "dark" ? color.ink.default : palette.violet[0];
  const markWidth = size * (small ? 0.86 : 0.74);
  const scale = markWidth / markBox.width;
  const x = (size - markWidth) / 2;
  const y = (size - markBox.height * scale) / 2;
  return svg(
    size,
    size,
    `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${background}"/>${mark(
      x,
      y,
      r2(scale * 100000) / 100000,
      theme === "dark" ? onDark : onLight,
      small ? markSmallStroke : 0,
    )}`,
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

// The outlines the React logo and the videos draw.
write(
  join(root, "packages/tokens/src/wordmark.ts"),
  `// Generated by \`pnpm --filter @repo/brand logos\` from brandName and
// brandByline, in Poppins. Do not edit. Each is an \`Outline\` from ./mark.ts.

/** The name, in Poppins ExtraBold. */
export const nameOutline = ${JSON.stringify(words.name)};

/** The byline, in Poppins Medium. */
export const bylineOutline = ${JSON.stringify(words.byline)};
`,
);

const themes = {
  light: onLight,
  dark: onDark,
  white: allOne("#FFFFFF"),
  ink: allOne(color.ink.default),
} as const;

for (const [theme, colours] of Object.entries(themes)) {
  for (const shape of ["horizontal", "stacked"] as const) {
    const base = shape === "horizontal" ? "logo" : "logo-stacked";
    write(join(assets, `${base}-${theme}.svg`), logo(shape, false, colours));
    write(
      join(assets, `${base}-${theme}-byline.svg`),
      logo(shape, true, colours),
    );
  }
  write(join(assets, `mark-${theme}.svg`), markOnly(colours));
}
// The dark logos on their own background, ready for slides and documents.
write(
  join(assets, "logo-stacked-dark-byline-tile.svg"),
  logo("stacked", true, onDark, color.ink.default),
);

const darkTile = tile("dark");
const smallTile = tile("dark", true);
write(join(assets, "tile-dark.svg"), darkTile);
write(join(assets, "tile-light.svg"), tile("light"));
write(join(assets, "tile-dark-small.svg"), smallTile);
for (const size of [1024, 512, 256, 128]) {
  write(join(assets, `tile-dark-${size}.png`), await png(darkTile, size));
}
write(join(assets, "tile-dark-64.png"), await png(smallTile, 64));

// Favicons: Next's app-directory files for the site, public/ for the Vite
// apps. Browser tabs get the thickened mark.
const favicon = ico(
  await Promise.all(
    [16, 32, 48].map(async (size) => ({
      size,
      data: await png(smallTile, size),
    })),
  ),
);
const touchIcon = await png(darkTile, 180);
write(join(root, "apps/web/app/favicon.ico"), favicon);
write(join(root, "apps/web/app/icon.svg"), smallTile);
write(join(root, "apps/web/app/apple-icon.png"), touchIcon);
for (const app of ["teach", "play"]) {
  write(join(root, `apps/${app}/public/favicon.ico`), favicon);
  write(join(root, `apps/${app}/public/icon.svg`), smallTile);
  write(join(root, `apps/${app}/public/apple-touch-icon.png`), touchIcon);
}
