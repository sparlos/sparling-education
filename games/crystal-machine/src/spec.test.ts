// @vitest-environment node
// Reads SPEC.md and fails when the code drifts from it, or the spec from the code.
import {
  describeManifestSpec,
  readSpec,
  stringRows,
} from "@repo/game-kit/spec";
import { describe, expect, it } from "vitest";
import { endingMs, momentMs } from "./game/GiantCrystal.tsx";
import { manifest } from "./manifest.ts";
import {
  missesBeforeGuided,
  missesForHint1,
  missesForHint2,
} from "./rules/job.ts";
import {
  jobsPerPlay,
  makeJob,
  type TierId,
  tierExpectations,
} from "./rules/jobs.ts";
import { misconceptions } from "./rules/judge.ts";
import { runMachine } from "./rules/machine.ts";
import { askedFor, runDetail } from "./rules/teacher.ts";
import { fixedStrings, numberWord, placeNames, strings } from "./strings.ts";

const spec = readSpec(new URL("../SPEC.md", import.meta.url));

describeManifestSpec(spec, manifest);

describe("the manifest's tiers come from the rules' tables", () => {
  it.each(["g3", "g4", "g5"] as TierId[])("%s", (tier) => {
    expect(tierExpectations(tier)).toEqual([
      ...manifest.tiers[tier].expectations,
    ]);
  });
});

describe("the strings match SPEC.md", () => {
  it("has every single string word for word", () => {
    expect(stringRows(spec)).toEqual(fixedStrings);
  });

  it("has the place family", () => {
    expect(spec.section("Strings")).toContain(
      `| \`place.0\` … \`place.4\` | ${placeNames.join(", ")} (spoken when a chute is tapped) |`,
    );
    placeNames.forEach((name, p) => {
      expect(strings[`place.${p}` as "place.0"]).toBe(name);
    });
  });

  it("has the number family, one to ninety-nine", () => {
    expect(spec.section("Strings")).toContain(
      '| `num.1` … `num.99` | The number family: "one" to "ninety-nine" (99 strings)',
    );
    expect(strings["num.1"]).toBe(numberWord(1));
    expect(strings["num.99"]).toBe("ninety-nine");
    const nums = Object.keys(strings).filter((id) => /^num\.\d+$/.test(id));
    expect(nums).toHaveLength(99);
    expect(Object.keys(strings)).toHaveLength(
      Object.keys(fixedStrings).length + placeNames.length + 99,
    );
  });
});

describe("the rules match SPEC.md", () => {
  it("plays the jobs per play it names", () => {
    expect(spec.section("Tiers")).toContain(
      `Every tier: ${jobsPerPlay} jobs per play.`,
    );
  });

  it("climbs the help ladder at the misses it names", () => {
    const effort = spec.section("Effort");
    expect(effort).toContain(
      `It starts to glow after **${missesForHint1} misses**`,
    );
    expect(effort).toContain(`After **${missesForHint2} misses** in all`);
    expect(effort).toContain(`After **${missesBeforeGuided} misses** in all`);
    expect(spec.section("Attempts")).toContain(
      `(${missesForHint1}, ${missesForHint2} and ${missesBeforeGuided} misses for the help steps, 1 match per misconception)`,
    );
  });

  it("records each misconception after the matches it names", () => {
    const section = spec.section("Misconceptions");
    for (const [id, m] of Object.entries(misconceptions)) {
      const body = section.slice(section.indexOf(`### \`${id}\``));
      expect(body).toMatch(
        new RegExp(`Recorded after \\*\\*${m.threshold}\\*\\* match`),
      );
    }
  });
});

describe("the journey matches SPEC.md", () => {
  const journey = spec.section("Journey");

  it("stays inside the limit between jobs, at the time it names", () => {
    expect(momentMs).toBeLessThanOrEqual(4000);
    expect(journey).toContain(
      `in about ${(momentMs / 1000).toFixed(1)} seconds`,
    );
  });

  it("ends at the length it names", () => {
    expect(journey).toContain(`for about ${endingMs / 1000} seconds`);
  });

  it("says the lines it names", () => {
    expect(journey).toContain(`"${strings["journey.goal"]}"`);
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
  const g3 = (n: number, closed: (0 | 1 | 2)[]) =>
    makeJob(
      n,
      3,
      closed,
      closed.length ? "math-2020.g3.B1.1" : "math-2020.g3.B1.5",
    );
  const hundredsClosed = g3(160, [2]);

  it("has every row", () => {
    expect(Object.keys(rows)).toHaveLength(6);
  });

  it("asked", () => {
    expect(rows["asked: Every try at a job with all chutes open"]).toBe(
      askedFor(g3(607, [])),
    );
    expect(rows["asked: One chute closed"]).toBe(askedFor(hundredsClosed));
    expect(rows["asked: Two chutes closed"]).toBe(
      askedFor(makeJob(10620, 5, [4, 3], "math-2020.g5.B1.1")),
    );
  });

  it("detail", () => {
    expect(rows["detail: A miss"]).toBe(
      runDetail(hundredsClosed, runMachine([0, 6, 0], 3), false),
    );
    expect(rows["detail: Made it"]).toBe(
      runDetail(hundredsClosed, runMachine([0, 16, 0], 3), false),
    );
    expect(rows["detail: The same plan as the run before"]).toBe(
      runDetail(hundredsClosed, runMachine([0, 6, 0], 3), true),
    );
  });
});
