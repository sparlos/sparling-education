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
import { manifest } from "./manifest.ts";
import { distractors, g5Sets, tasksPerPlay } from "./rules/generate.ts";
import { misconceptionTiers, thresholds } from "./rules/judge.ts";
import {
  missesBeforeGuided,
  missesForHint1,
  missesForHint2,
} from "./rules/task.ts";
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
