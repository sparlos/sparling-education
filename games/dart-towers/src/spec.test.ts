// @vitest-environment node
// Reads SPEC.md and fails when the code drifts from it, or the spec from the code.
import {
  describeManifestSpec,
  readSpec,
  stringRows,
} from "@repo/game-kit/spec";
import { describe, expect, it } from "vitest";
import { endingMs, momentMs } from "./game/DartTowers.tsx";
import { leastBug } from "./game/swarm.ts";
import { manifest } from "./manifest.ts";
import { askedFor, tryDetail } from "./rules/teacher.ts";
import { panes } from "./rules/volley.ts";
import {
  byPlace,
  makeWave,
  padDigits,
  type TierId,
  tierExpectation,
  wavesPerPlay,
} from "./rules/waves.ts";
import { fixedStrings, numberWord, strings } from "./strings.ts";

const spec = readSpec(new URL("../SPEC.md", import.meta.url));

describeManifestSpec(spec, manifest);

describe("the manifest's tiers come from the rules' tables", () => {
  it.each(["g3", "g4", "g5"] as TierId[])("%s", (tier) => {
    expect(manifest.tiers[tier].expectations).toEqual([tierExpectation[tier]]);
  });
});

describe("the strings match SPEC.md", () => {
  it("has every single string word for word", () => {
    expect(stringRows(spec)).toEqual(fixedStrings);
  });

  it("has the number family, one to ninety-nine", () => {
    expect(spec.section("Strings")).toContain(
      '| `num.1` … `num.99` | The number family: "one" to "ninety-nine"',
    );
    expect(strings["num.1"]).toBe(numberWord(1));
    expect(strings["num.99"]).toBe("ninety-nine");
    expect(Object.keys(strings)).toHaveLength(
      Object.keys(fixedStrings).length + 99,
    );
  });
});

describe("the rules match SPEC.md", () => {
  it("plays the waves per play it names", () => {
    expect(spec.section("Tiers")).toContain(
      `Every tier: **${wavesPerPlay} waves per play**`,
    );
  });

  it("takes the pad digits it names", () => {
    const tiers = spec.section("Tiers");
    expect(tiers).toContain(`The pad takes ${padDigits.g3} digits.`);
    expect(tiers).toContain(`The pad takes ${padDigits.g4} digits.`);
    expect(padDigits.g5).toBe(padDigits.g4);
  });

  it("breaks the panes it names", () => {
    expect(spec.section("Mechanic")).toContain(
      `break the greenhouse's ${panes} panes`,
    );
  });

  it("draws separate bugs down to the size it names", () => {
    expect(spec.section("Mechanic")).toContain(
      `Separate bugs** while each bug is at least ${leastBug} px`,
    );
  });
});

describe("the journey matches SPEC.md", () => {
  const journey = spec.section("Journey");

  it("moves the sky in the time it names", () => {
    expect(journey).toContain(
      `in about ${(momentMs / 1000).toFixed(1)} seconds`,
    );
  });

  it("ends at the length it names", () => {
    expect(journey).toContain(`about ${endingMs / 1000} seconds`);
  });

  it("says the lines it names", () => {
    expect(journey).toContain(`"${strings["play.goal"]}"`);
    expect(journey).toContain(`"${strings["play.done"]}"`);
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
  const grade5 = makeWave(byPlace(24), byPlace(38));

  it("has every row", () => {
    expect(Object.keys(rows)).toHaveLength(8);
  });

  it("asked", () => {
    expect(rows["asked: Every try at a one-part wave"]).toBe(
      askedFor(makeWave([4], [5])),
    );
    expect(rows["asked: Every try at a wave with parts"]).toBe(
      askedFor(grade5),
    );
  });

  it("detail", () => {
    expect(rows["detail: Too few"]).toBe(tryDetail(grade5, 632, false));
    expect(rows["detail: One short"]).toBe(tryDetail(grade5, 911, false));
    expect(rows["detail: Too many"]).toBe(tryDetail(grade5, 6312, false));
    expect(rows["detail: One extra"]).toBe(tryDetail(grade5, 913, false));
    expect(rows["detail: Exactly right"]).toBe(tryDetail(grade5, 912, false));
    expect(rows["detail: The same number as the try before"]).toBe(
      tryDetail(grade5, 632, true),
    );
  });
});
