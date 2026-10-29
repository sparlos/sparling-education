import { describe, expect, it } from "vitest";
import { teacherTextParts } from "./teacher-text.ts";

const fraction = (
  numerator: number,
  denominator: number,
  label: string,
  whole: number | null = null,
) => ({ kind: "fraction", whole, numerator, denominator, label });
const text = (t: string) => ({ kind: "text", text: t });

describe("teacherTextParts", () => {
  it("reads a fraction", () => {
    expect(teacherTextParts("3/8")).toEqual([fraction(3, 8, "three eighths")]);
  });

  it("reads a fraction greater than one", () => {
    expect(teacherTextParts("Reach 5/4.")).toEqual([
      text("Reach "),
      fraction(5, 4, "five fourths"),
      text("."),
    ]);
  });

  it("reads a mixed number", () => {
    expect(teacherTextParts("Landed on 1 3/4")).toEqual([
      text("Landed on "),
      fraction(3, 4, "one and three fourths", 1),
    ]);
  });

  it("keeps a whole number before an improper fraction apart", () => {
    expect(teacherTextParts("2 5/4")).toEqual([
      text("2 "),
      fraction(5, 4, "five fourths"),
    ]);
  });

  it("reads several fractions, singular and plural", () => {
    expect(
      teacherTextParts("Hopped 1/8 + 1/2 + 2/2: splashed at 4/8."),
    ).toEqual([
      text("Hopped "),
      fraction(1, 8, "one eighth"),
      text(" + "),
      fraction(1, 2, "one half"),
      text(" + "),
      fraction(2, 2, "two halves"),
      text(": splashed at "),
      fraction(4, 8, "four eighths"),
      text("."),
    ]);
  });

  it("draws a date-like 10/29 inside words as a fraction, as games are told", () => {
    expect(teacherTextParts("Played 10/29 at recess")).toEqual([
      text("Played "),
      fraction(10, 29, "ten twenty-ninths"),
      text(" at recess"),
    ]);
  });

  it("names unusual denominators", () => {
    expect(
      teacherTextParts("1/3 3/12 7/20 1/100 2/1").map((p) =>
        p.kind === "fraction" ? p.label : p.text,
      ),
    ).toEqual([
      "one third",
      " ",
      "three twelfths",
      " ",
      "seven twentieths",
      " ",
      "one one hundredth",
      " ",
      "two wholes",
    ]);
  });

  it("leaves text with no fractions, or nothing to divide by, as it is", () => {
    expect(teacherTextParts("Hopped once, then stopped.")).toEqual([
      text("Hopped once, then stopped."),
    ]);
    expect(teacherTextParts("3/0")).toEqual([text("3/0")]);
    expect(teacherTextParts("")).toEqual([]);
  });
});
