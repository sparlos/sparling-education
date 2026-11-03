// @vitest-environment node
// Reads SPEC.md and fails when the code drifts from it, or the spec from the code.
import {
  codes,
  describeManifestSpec,
  readSpec,
  stringRows,
  subsections,
} from "@repo/game-kit/spec";
import { describe, expect, it } from "vitest";
import { endingMs, momentMs, spots } from "./game/TreasureMap.tsx";
import { manifest } from "./manifest.ts";
import type { Course, Run } from "./rules/course.ts";
import { distractors, g5Sets, tasksPerPlay } from "./rules/generate.ts";
import { misconceptionTiers, thresholds } from "./rules/judge.ts";
import {
  missesBeforeGuided,
  missesForHint1,
  missesForHint2,
} from "./rules/task.ts";
import {
  askedFor,
  fullPlanDetail,
  groupedFrom,
  runDetail,
} from "./rules/teacher.ts";
import { denominators, fixedStrings, strings } from "./strings.ts";

const spec = readSpec(new URL("../SPEC.md", import.meta.url));
const section = spec.section;

// Slug, version, renderer, avatar use, tiers and misconceptions.
describeManifestSpec(spec, manifest);

describe("the misconceptions match SPEC.md", () => {
  it("has each one's threshold, and is spotted only at its tiers", () => {
    for (const { heading, body } of subsections(section("Misconceptions"))) {
      const key = codes(heading)[0] as keyof typeof manifest.misconceptions;
      const threshold = /Recorded after \*\*(\d+)\*\* match/.exec(body)?.[1];
      expect(Number(threshold)).toBe(thresholds[key]);
      // Spotted only at the tiers whose expectations it belongs to.
      const tiers = Object.entries(manifest.tiers)
        .filter(([, t]) =>
          t.expectations.some((e) =>
            (
              manifest.misconceptions[key].expectations as readonly string[]
            ).includes(e),
          ),
        )
        .map(([tier]) => tier);
      expect(misconceptionTiers[key]).toEqual(tiers);
    }
  });
});

describe("the strings match SPEC.md", () => {
  it("has every fixed string word for word", () => {
    expect(stringRows(spec)).toEqual({
      ...fixedStrings,
      "hop.1": strings["hop.1"],
    });
  });

  it("has the hop family", () => {
    const row =
      /\| `hop\.2` … `hop\.12` \| (.+) \(`hop\.<d>` for d = ([\d, ]+)\) \|/.exec(
        section("Strings"),
      );
    const names = row?.[1]?.split(", ") ?? [];
    const ds = row?.[2]?.split(", ").map(Number) ?? [];
    expect(ds).toEqual([...denominators]);
    expect(names).toEqual(
      ds.map((d) => strings[`hop.${d}` as keyof typeof strings]),
    );
  });

  it("has the amount family: its denominators, size and examples", () => {
    const row =
      /\| `amount\.<n>-<d>` \| (.+) \|/.exec(section("Strings"))?.[1] ?? "";
    expect(row).toContain(`d = ${denominators.join(", ")}, and n = 1 to 3 × d`);
    const amounts = Object.keys(strings).filter((id) =>
      id.startsWith("amount."),
    );
    expect(row).toContain(`(${amounts.length} strings)`);
    expect(strings["amount.1-8"]).toBe("one eighth");
    expect(strings["amount.3-8"]).toBe("three eighths");
    expect(strings["amount.11-4"]).toBe("eleven fourths");
    expect(strings["amount.36-12"]).toBe("thirty-six twelfths");
    for (const example of row.matchAll(/"([a-z -]+)"/g))
      expect(Object.values(strings)).toContain(example[1]);
  });
});

describe("the rules match SPEC.md", () => {
  it("plays 6 tasks per play", () => {
    expect(section("Tiers")).toContain(
      `Every tier: ${tasksPerPlay} tasks per play.`,
    );
  });

  it("offers the distractors and Grade 5 block sets it names", () => {
    const tiers = section("Tiers");
    const frac: Record<number, string> = {
      2: "½",
      3: "⅓",
      4: "¼",
      5: "⅕",
      6: "⅙",
      8: "⅛",
      10: "⅒",
      12: "1⁄12",
    };
    for (const [d, big] of Object.entries(distractors))
      expect(tiers).toContain(`${frac[big]} with ${frac[Number(d)]}`);
    // The sets write tenths as 1⁄10.
    const inSet: Record<number, string> = { ...frac, 10: "1⁄10" };
    for (const set of g5Sets)
      expect(tiers).toContain(`{${set.map((d) => inSet[d]).join(", ")}}`);
  });

  it("climbs the help ladder at the misses it names", () => {
    const effort = section("Effort");
    expect(effort).toContain(
      `It starts to glow after **${missesForHint1} misses**`,
    );
    expect(effort).toContain(
      `After **${missesForHint2} misses** in all, at least one of them with hint 1 on`,
    );
    expect(effort).toContain(`After **${missesBeforeGuided} misses** in all`);
  });
});

describe("the journey matches SPEC.md", () => {
  const journey = section("Journey");

  it("stays inside the limit between tasks, at the time it names", () => {
    expect(momentMs).toBeLessThanOrEqual(4000);
    expect(journey).toContain(
      `in about ${(momentMs / 1000).toFixed(1)} seconds`,
    );
  });

  it("ends at the length it names", () => {
    expect(journey).toContain(`about ${(endingMs / 1000).toFixed(1)} seconds`);
  });

  it("has a spot for each task", () => {
    expect(spots).toHaveLength(tasksPerPlay);
    expect(journey).toContain("six spots");
  });

  it("says the lines it names", () => {
    expect(journey).toContain(`"${strings["journey.goal"]}"`);
    expect(journey).toContain(`"${strings["play.done"]}"`);
  });
});

describe("what teachers read matches SPEC.md", () => {
  const course = (
    unit: number,
    n: number,
    d: number,
    offer: number[],
  ): Course => ({
    unit,
    end: 3 * unit,
    stones: [],
    goal: (n * unit) / d,
    shown: { n, d },
    blocks: offer
      .map((b) => ({ d: b, size: unit / b }))
      .sort((a, b) => a.size - b.size),
    budget: 30,
  });
  const g3 = course(8, 3, 8, [8, 4, 1]);
  const g5 = course(8, 5, 4, [8, 4, 2, 1]);
  const tenths = course(10, 23, 10, [10, 5, 1]);
  const twelfths = course(12, 2, 3, [12, 6, 4, 3, 1]);
  const run = (landings: number[], end: Run["end"]): Run => ({
    landings,
    end,
  });
  const splash = run([1, 2, 4], { kind: "splash", at: 4, from: 2, hop: 2 });

  it("has every asked and detail text the rules write", () => {
    const rows = [
      ...section("Attempts").matchAll(
        /^\| `(asked|detail)` \| [^|]+ \| `([^`]+)` \|$/gm,
      ),
    ].map((m) => [m[1], m[2]]);
    expect(rows).toEqual([
      ["asked", askedFor(g3)],
      ["asked", askedFor(g5)],
      ["detail", runDetail(g5, [8, 8, 4], splash)],
      [
        "detail",
        runDetail(g3, [4, 4, 4], run([2, 4], { kind: "past", at: 4 })),
      ],
      ["detail", runDetail(g3, [4], run([2], { kind: "short", at: 2 }))],
      [
        "detail",
        runDetail(g5, [2, 2, 4], run([4, 8, 10], { kind: "goal", at: 10 })),
      ],
      ["detail", runDetail(g5, [8, 8, 4], splash, true)],
      ["detail", fullPlanDetail(twelfths)],
      [
        "detail",
        runDetail(
          tenths,
          [...Array(12).fill(10), 5, 5],
          run([...Array.from({ length: 12 }, (_, i) => i + 1), 14], {
            kind: "splash",
            at: 14,
            from: 12,
            hop: 12,
          }),
        ),
      ],
    ]);
  });

  it("counts runs of the same hop from the length it names", () => {
    expect(section("Attempts")).toContain(
      `A run of the same hop is counted once it's ${groupedFrom} long`,
    );
  });
});
