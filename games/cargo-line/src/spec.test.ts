// @vitest-environment node
// Reads SPEC.md and fails when the code drifts from it, or the spec from the code.
import {
  describeManifestSpec,
  readSpec,
  stringRows,
} from "@repo/game-kit/spec";
import { describe, expect, it } from "vitest";
import { manifest } from "./manifest.ts";
import { lapsPerPlay, padDigits } from "./rules/generate.ts";
import { matchesToRecord } from "./rules/judge.ts";
import { makeLap, mountainParts, runTrip, type Station } from "./rules/lap.ts";
import { missesForDemo, missesForHelp } from "./rules/task.ts";
import { askedFor, tryDetail } from "./rules/teacher.ts";
import { fixedStrings, numberWord, placeNames, strings } from "./strings.ts";

const spec = readSpec(new URL("../SPEC.md", import.meta.url));

describeManifestSpec(spec, manifest);

/** Single strings written in a row of two: `a`, `b` | A. / B. */
const paired = [
  ["demo.add-tenths", "demo.add-hundredths"],
  ["demo.take-tenths", "demo.take-hundredths"],
] as const;

describe("the strings match SPEC.md", () => {
  const section = spec.section("Strings");

  it("has every single string word for word", () => {
    const single = { ...fixedStrings } as Record<string, string>;
    for (const ids of paired) for (const id of ids) delete single[id];
    expect(stringRows(spec)).toEqual(single);
  });

  it("has the paired strings word for word", () => {
    for (const [a, b] of paired)
      expect(section).toContain(
        `| \`${a}\`, \`${b}\` | ${fixedStrings[a]} / ${fixedStrings[b]} |`,
      );
  });

  it("has the replay's place families", () => {
    for (const verb of ["add", "take"] as const) {
      const lines = placeNames.map((_, p) => strings[`demo.${verb}.${p as 0}`]);
      expect(section).toContain(
        `| \`demo.${verb}.0\` … \`demo.${verb}.4\` | ${lines.join(" / ")} |`,
      );
    }
  });

  it("has the number family, one to ninety-nine", () => {
    expect(section).toContain(
      '| `num.1` … `num.99` | The number family: "one" to "ninety-nine", shared with Crystal Machine. |',
    );
    expect(strings["num.1"]).toBe(numberWord(1));
    expect(strings["num.99"]).toBe("ninety-nine");
    const nums = Object.keys(strings).filter((id) => /^num\.\d+$/.test(id));
    expect(nums).toHaveLength(99);
    expect(Object.keys(strings)).toHaveLength(
      Object.keys(fixedStrings).length + 2 * placeNames.length + 99,
    );
  });
});

describe("the rules match SPEC.md", () => {
  it("plays the trips per play it names", () => {
    expect(spec.section("Tiers")).toContain(
      `Every tier: **${lapsPerPlay} trips per play.**`,
    );
  });

  it("climbs the help ladder at the misses it names", () => {
    const effort = spec.section("Effort");
    expect(effort).toContain(
      `It starts to glow after **${missesForHelp} misses**`,
    );
    expect(effort).toContain(`After **${missesForDemo} misses** in all`);
    expect(spec.section("Attempts")).toContain(
      `(${missesForHelp} misses for the trip picture, ${missesForDemo} for the replay, ${matchesToRecord} match per misconception)`,
    );
  });

  it("takes the pad digits it names", () => {
    expect(spec.section("Strings")).toContain(
      `The pad takes at most ${padDigits.g3} digits at Grade 3, ${padDigits.g4} at Grade 4 and ${padDigits.g5} at Grade 5`,
    );
  });
});

describe("the mountain matches SPEC.md", () => {
  it("has the parts and stops it names, in climbing order", () => {
    const mechanic = spec.section("Mechanic");
    const rows = ["Green meadows", "Pine forest", "Rock and snow"].map(
      (name, i) =>
        `| ${name} | ${2 * i + 1}–${2 * i + 2} | the ${mountainParts[i]?.[0]}, the ${mountainParts[i]?.[1]} |`,
    );
    for (const row of rows) expect(mechanic).toContain(row);
  });

  it("has an at-the-stop string for every stop", () => {
    for (const part of mountainParts)
      for (const place of part)
        expect(fixedStrings[`at.${place}`]).toBe(`at the ${place}.`);
  });
});

describe("the Attempts table, rebuilt from the rules", () => {
  const rows = Object.fromEntries(
    [
      ...spec
        .section("Attempts")
        .matchAll(/^\| `(asked|detail)` \| ([^|]+) \| `([^`]+)` \|$/gm),
    ].map(([, field, when, text]) => [`${field}: ${when?.trim()}`, text]),
  );
  const farm = (loads: boolean, amount: number): Station => ({
    place: "farm",
    loads,
    amount,
  });
  const startMissing = makeLap(0, 387, [farm(false, 136)], { what: "start" });

  it("has every row", () => {
    expect(Object.keys(rows)).toHaveLength(7);
  });

  it("asked", () => {
    expect(rows["asked: Every try at a trip"]).toBe(askedFor(startMissing));
    expect(rows["asked: Two stops, end missing"]).toBe(
      askedFor(
        makeLap(
          0,
          57_903,
          [
            farm(false, 28_542),
            { place: "windmill", loads: true, amount: 5032 },
          ],
          { what: "end" },
        ),
      ),
    );
    expect(rows["asked: Decimal trip"]).toBe(
      askedFor(
        makeLap(2, 218, [{ place: "quarry", loads: false, amount: 40 }], {
          what: "change",
          at: 0,
        }),
      ),
    );
  });

  it("detail", () => {
    const stall = runTrip(startMissing, 115);
    expect(rows["detail: A stall"]).toBe(tryDetail(startMissing, stall, false));
    expect(rows["detail: A different number"]).toBe(
      tryDetail(startMissing, runTrip(startMissing, 377), false),
    );
    expect(rows["detail: Made it"]).toBe(
      tryDetail(startMissing, runTrip(startMissing, 387), false),
    );
    expect(rows["detail: The same number as the try before"]).toBe(
      tryDetail(startMissing, stall, true),
    );
  });
});
