// @vitest-environment node
// Reads SPEC.md and fails when the code drifts from it, or the spec from the code.
import { readFileSync } from "node:fs";
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

const spec = readFileSync(new URL("../SPEC.md", import.meta.url), "utf8");

/** The text of a `## heading` section, up to the next one. */
function section(heading: string): string {
  const start = spec.indexOf(`\n## ${heading}\n`);
  if (start < 0) throw new Error(`SPEC.md has no "${heading}" section`);
  const rest = spec.slice(start + heading.length + 5);
  const end = rest.indexOf("\n## ");
  return end < 0 ? rest : rest.slice(0, end);
}

describe("the manifest matches SPEC.md", () => {
  it("has its slug, version, renderer and avatar use", () => {
    expect(spec).toContain(`Slug: ${manifest.slug} `);
    expect(spec).toContain(`Version: ${manifest.version}\n`);
    expect(spec).toContain(`Renderer: ${manifest.renderer}\n`);
    expect(spec).toContain(`Avatar: ${manifest.avatar}\n`);
  });

  it("has each tier's grade and expectations", () => {
    const tiers = section("Tiers");
    const found = [
      ...tiers.matchAll(/### (g\d): Grade (\d)\n\n- Expectations: (.+)/g),
    ];
    expect(found.map(([, id]) => id)).toEqual(Object.keys(manifest.tiers));
    for (const [, id, grade, list] of found) {
      const tier = manifest.tiers[id as keyof typeof manifest.tiers];
      expect(tier.grade).toBe(Number(grade));
      expect(codes(list ?? "")).toEqual(tier.expectations);
    }
  });

  it("has each misconception, the expectations it belongs to, and its threshold", () => {
    const text = section("Misconceptions");
    const found = [
      ...text.matchAll(/### `([a-z-]+)`\n([\s\S]*?)(?=\n### |$)/g),
    ];
    expect(found.map(([, id]) => id)).toEqual(
      Object.keys(manifest.misconceptions),
    );
    for (const [, id, body = ""] of found) {
      const key = id as keyof typeof manifest.misconceptions;
      const line = /- Expectations: (.+)/.exec(body)?.[1] ?? "";
      expect(codes(line)).toEqual(manifest.misconceptions[key].expectations);
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

  it("has every fixed string word for word", () => {
    const rows = [
      ...section("Strings").matchAll(/^\| `([a-z0-9.-]+)` \| (.+) \|$/gm),
    ];
    expect(Object.fromEntries(rows.map(([, id, text]) => [id, text]))).toEqual({
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

const codes = (list: string) =>
  [...list.matchAll(/`([^`]+)`/g)].map(([, code]) => code);
