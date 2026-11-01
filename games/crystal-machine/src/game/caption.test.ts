// @vitest-environment node
import { describe, expect, it } from "vitest";
import { type StringId, strings } from "../strings.ts";
import { captionText } from "./caption.ts";

const t = (id: StringId) => strings[id] ?? id;

describe("captionText", () => {
  it("shows numbers as numerals, as on screen", () => {
    expect(
      captionText(
        [
          "job.make",
          "num.84",
          "num.thousand",
          "num.6",
          "num.hundred",
          "num.20",
          "job.with",
          "num.13",
          "job.crystals",
          "closed.2",
        ],
        t,
      ),
    ).toBe("Make 84 620 with 13 crystals. The hundreds chute is closed.");
  });

  it("ends a sentence after a number", () => {
    expect(
      captionText(
        [
          "run.made",
          "num.67",
          "run.job-is",
          "num.6",
          "num.hundred",
          "num.7",
          "hint.ready",
        ],
        t,
      ),
    ).toBe(
      "The machine made 67. The job is 607. Want a hint? Tap the hint button.",
    );
  });

  it("writes a count's place lower case", () => {
    expect(captionText(["guided.first", "num.16", "place.1"], t)).toBe(
      "I'll set the first chute. You set the rest. 16 tens.",
    );
    expect(captionText(["place.4"], t)).toBe("Ten thousands");
  });
});
