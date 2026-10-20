import assert from "node:assert/strict";
import { test } from "node:test";
import { contrastRatio, hexToRgb01 } from "./color.ts";
import {
  breakpoint,
  color,
  customMedia,
  palette,
  type ToneTokens,
} from "./index.ts";

// WCAG 2.2 AA: 4.5:1 for body text, 3:1 for UI component boundaries and focus.
const TEXT = 4.5;
const UI = 3;

const lightSurfaces = {
  page: color.surface.page,
  raised: color.surface.raised,
  sunken: color.surface.sunken,
};

function expectContrast(fg: string, bg: string, min: number, label: string) {
  const ratio = contrastRatio(fg, bg);
  assert.ok(
    ratio >= min,
    `${label}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${min}:1`,
  );
}

const tones: Record<string, ToneTokens> = {
  brand: color.brand,
  neutral: color.neutral,
  ...color.audience,
};

test("body text is readable on every light surface", () => {
  for (const [name, bg] of Object.entries(lightSurfaces)) {
    expectContrast(color.ink.default, bg, TEXT, `ink.default/${name}`);
    expectContrast(color.ink.muted, bg, TEXT, `ink.muted/${name}`);
  }
});

test("inverse text is readable on the inverse surface", () => {
  expectContrast(color.ink.inverse, color.surface.inverse, TEXT, "inverse");
  expectContrast(
    color.ink.inverseMuted,
    color.surface.inverse,
    TEXT,
    "inverseMuted",
  );
});

for (const [name, tone] of Object.entries(tones)) {
  test(`${name} tone meets AA`, () => {
    expectContrast(tone.onFill, tone.fill, TEXT, `${name} onFill/fill`);
    expectContrast(tone.onFill, tone.fillHover, TEXT, `${name} onFill/hover`);
    expectContrast(tone.text, tone.soft, TEXT, `${name} text/soft`);
    for (const [surface, bg] of Object.entries(lightSurfaces)) {
      expectContrast(tone.text, bg, TEXT, `${name} text/${surface}`);
      expectContrast(tone.edge, bg, UI, `${name} edge/${surface}`);
    }
  });
}

test("focus ring is visible on every light surface", () => {
  for (const [name, bg] of Object.entries(lightSurfaces)) {
    expectContrast(color.focus, bg, UI, `focus/${name}`);
  }
});

test("status colours are readable as text", () => {
  for (const [name, bg] of Object.entries(lightSurfaces)) {
    expectContrast(color.status.success, bg, TEXT, `success/${name}`);
    expectContrast(color.status.info, bg, TEXT, `info/${name}`);
  }
  expectContrast(color.status.success, color.status.successSoft, TEXT, "ok");
  expectContrast(color.status.info, color.status.infoSoft, TEXT, "info");
});

test("palette scales run light to dark", () => {
  for (const [name, scale] of Object.entries(palette)) {
    assert.equal(scale.length, 10, name);
    const lum = scale.map((hex) => contrastRatio(hex, "#000000"));
    for (let i = 1; i < lum.length; i++) {
      assert.ok(
        (lum[i] ?? 0) < (lum[i - 1] ?? 0),
        `${name}[${i}] is not darker`,
      );
    }
  }
});

test("hexToRgb01 converts for game engines", () => {
  assert.deepEqual(hexToRgb01("#FF0080"), { r: 1, g: 0, b: 128 / 255 });
  assert.throws(() => hexToRgb01("orange"));
});

test("custom media covers every breakpoint, up and down", () => {
  for (const [name, px] of Object.entries(breakpoint)) {
    assert.equal(
      customMedia[`--k-${name}-up` as never],
      `(min-width: ${px / 16}em)`,
    );
    assert.match(
      customMedia[`--k-${name}-down` as never],
      /^\(max-width: [\d.]+em\)$/,
    );
  }
});
