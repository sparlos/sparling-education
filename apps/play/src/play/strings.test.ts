import { describe, expect, it } from "vitest";
import { translator } from "./strings.ts";

const strings = {
  "en-CA": { hello: "Hello", bye: "Bye" },
  "fr-CA": { hello: "Bonjour" },
};

describe("translator", () => {
  it("uses the student's locale", () => {
    expect(translator(strings, "fr-CA")("hello")).toBe("Bonjour");
  });

  it("falls back to English for a string not yet translated", () => {
    expect(translator(strings, "fr-CA")("bye")).toBe("Bye");
  });

  it("refuses an unknown string", () => {
    expect(() => translator(strings, "en-CA")("nope")).toThrow();
  });
});
