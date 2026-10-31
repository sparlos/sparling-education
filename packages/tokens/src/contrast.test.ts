import assert from "node:assert/strict";
import { test } from "node:test";
import { contrastRatio, hexToRgb01 } from "./color.ts";
import {
  breakpoint,
  classColours,
  color,
  customMedia,
  defaultClassColour,
  initialTint,
  initialTints,
  newClassColourOrder,
  nextClassColour,
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

// The three steps of a results ramp must differ by at least this contrast,
// so they're told apart by lightness alone.
const RAMP_STEP = 1.5;

const tones: Record<string, ToneTokens> = {
  brand: color.brand,
  neutral: color.neutral,
  ...color.audience,
  ...color.meaning,
  ...Object.fromEntries(
    classColours.map((c) => [`class colour ${c.slug}`, c.tone]),
  ),
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

test("focus ring, with its halo, is visible beside every fill", () => {
  const fills: [string, string][] = [
    ...Object.entries(tones).flatMap(([name, tone]) => [
      [`${name} fill`, tone.fill] as [string, string],
      [`${name} fillHover`, tone.fillHover] as [string, string],
    ]),
    ...classColours.flatMap((c) =>
      Object.entries(c.results).map(([step, { fill }]): [string, string] => [
        `${c.slug} results ${step}`,
        fill,
      ]),
    ),
  ];
  for (const [name, fill] of fills) {
    const ratio = Math.max(
      contrastRatio(color.focus, fill),
      contrastRatio(color.focusHalo, fill),
    );
    assert.ok(
      ratio >= UI,
      `focus by ${name} (${fill}) is ${ratio.toFixed(2)}:1, needs ${UI}:1`,
    );
  }
  expectContrast(color.focus, color.focusHalo, UI, "focus/halo");
});

test("there are 12 to 16 class colours, each with its own slug and name", () => {
  assert.ok(classColours.length >= 12 && classColours.length <= 16);
  assert.equal(
    new Set(classColours.map((c) => c.slug)).size,
    classColours.length,
  );
  assert.equal(
    new Set(classColours.map((c) => c.name)).size,
    classColours.length,
  );
  for (const c of classColours) assert.match(c.slug, /^[a-z]+(-[a-z]+)*$/);
});

for (const c of classColours) {
  test(`${c.slug}'s results ramp is readable and runs light to dark`, () => {
    const { weak, middle, strong } = c.results;
    for (const [step, { fill, text }] of Object.entries(c.results))
      expectContrast(text, fill, TEXT, `${c.slug} results ${step}`);
    expectContrast(weak.fill, middle.fill, RAMP_STEP, `${c.slug} weak/middle`);
    expectContrast(
      middle.fill,
      strong.fill,
      RAMP_STEP,
      `${c.slug} middle/strong`,
    );
    assert.ok(
      contrastRatio(weak.fill, "#000000") >
        contrastRatio(middle.fill, "#000000") &&
        contrastRatio(middle.fill, "#000000") >
          contrastRatio(strong.fill, "#000000"),
      `${c.slug}'s ramp doesn't run light to dark`,
    );
  });
}

test("a new class gets the first colour no other class has, from the default, then they cycle", () => {
  const slugs = newClassColourOrder.map((c) => c.slug);
  assert.equal(slugs[0], defaultClassColour);
  assert.equal(slugs.length, classColours.length);
  assert.equal(nextClassColour([]), slugs[0]);
  assert.equal(nextClassColour([slugs[0] as string]), slugs[1]);
  assert.equal(nextClassColour([slugs[1] as string]), slugs[0]);
  assert.equal(nextClassColour(slugs), slugs[0]);
  assert.equal(nextClassColour([...slugs, slugs[0] as string]), slugs[1]);
});

test("initials are readable on their tints, the same each time for a student", () => {
  for (const { fill, text } of initialTints)
    expectContrast(text, fill, TEXT, `initial ${fill}`);
  assert.deepEqual(initialTint("student-1"), initialTint("student-1"));
  const used = new Set(
    Array.from({ length: 40 }, (_, i) => initialTint(`student-${i}`).fill),
  );
  assert.ok(used.size > 4, "initial tints barely vary");
});

test("the sparkle's gold stands out on dark surfaces, and is never text", () => {
  expectContrast(color.sparkle, color.surface.inverse, UI, "sparkle/inverse");
  // Too light for text on any light surface: keep it to shapes.
  for (const bg of Object.values(lightSurfaces)) {
    assert.ok(contrastRatio(color.sparkle, bg) < TEXT);
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
