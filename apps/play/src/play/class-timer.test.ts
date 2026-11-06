import { describe, expect, it } from "vitest";
import { clockText, isWarningTime, phaseOf } from "./class-timer.ts";

describe("a timer's phase", () => {
  it("is none with neither timer", () => {
    expect(phaseOf(null, null, 0)).toEqual({ kind: "none" });
  });

  it("counts down to whichever ends sooner", () => {
    expect(phaseOf(10_000, 4000, 1000)).toEqual({
      kind: "running",
      leftMs: 3000,
    });
    expect(phaseOf(null, 4000, 1000)).toEqual({
      kind: "running",
      leftMs: 3000,
    });
  });

  it("is up for good when the teacher's is, and the student's to put away when only theirs is", () => {
    expect(phaseOf(1000, null, 1000)).toEqual({ kind: "up", own: false });
    expect(phaseOf(5000, 1000, 2000)).toEqual({ kind: "up", own: true });
    expect(phaseOf(1000, 1000, 2000)).toEqual({ kind: "up", own: false });
  });
});

describe("the clock", () => {
  it("shows minutes, rounded up, then seconds in the last minute", () => {
    expect(clockText(12 * 60_000)).toBe("12 min");
    expect(clockText(11 * 60_000 + 1)).toBe("12 min");
    expect(clockText(60_000)).toBe("0:59");
    expect(clockText(45_000)).toBe("0:45");
    expect(clockText(1)).toBe("0:01");
  });

  it("warns once, at two minutes left", () => {
    const at = (leftMs: number) => isWarningTime({ kind: "running", leftMs });
    expect(at(2 * 60_000 + 1)).toBe(false);
    expect(at(2 * 60_000)).toBe(true);
    expect(at(60_000)).toBe(false);
  });
});
