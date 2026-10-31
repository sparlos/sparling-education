// The parts of opentype.js the logo script uses; the package ships no types.
declare module "opentype.js" {
  export interface Path {
    toPathData(decimalPlaces?: number): string;
  }
  export interface Glyph {
    advanceWidth: number;
    getPath(x: number, y: number, fontSize: number): Path;
  }
  export interface Font {
    unitsPerEm: number;
    tables: { os2: { sCapHeight: number } };
    stringToGlyphs(text: string): Glyph[];
    getKerningValue(left: Glyph, right: Glyph): number;
  }
  const opentype: { parse(buffer: ArrayBuffer): Font };
  export default opentype;
}
