// Framework-agnostic colour helpers. No imports, so any runtime (Mantine,
// PlayCanvas, a test runner) can use them.

export interface Rgb01 {
  r: number;
  g: number;
  b: number;
}

/** "#RRGGBB" → channels in 0–1, e.g. `new pc.Color(r, g, b)` in PlayCanvas. */
export function hexToRgb01(hex: string): Rgb01 {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match?.[1]) throw new Error(`Expected a #RRGGBB colour, got "${hex}"`);
  const n = Number.parseInt(match[1], 16);
  return {
    r: ((n >> 16) & 0xff) / 255,
    g: ((n >> 8) & 0xff) / 255,
    b: (n & 0xff) / 255,
  };
}

function channelLuminance(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb01(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/** WCAG 2.x contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
