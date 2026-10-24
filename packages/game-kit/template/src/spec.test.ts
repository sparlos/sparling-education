// @vitest-environment node
// Reads SPEC.md and fails when the code drifts from it, or the spec from the code.
import {
  describeManifestSpec,
  readSpec,
  stringRows,
} from "@repo/game-kit/spec";
import { describe, expect, it } from "vitest";
import { manifest } from "./manifest.ts";
import { missesForHint, tasksPerPlay } from "./rules/rules.ts";
import { strings } from "./strings.ts";

const spec = readSpec(new URL("../SPEC.md", import.meta.url));

describeManifestSpec(spec, manifest);

describe("the strings match SPEC.md", () => {
  it("has every string word for word", () => {
    expect(stringRows(spec)).toEqual(strings);
  });
});

describe("the rules match SPEC.md", () => {
  it("plays the tasks per play it names", () => {
    expect(spec.section("Tiers")).toContain(
      `Every tier: ${tasksPerPlay} tasks per play.`,
    );
  });

  it("gives the hint at the misses it names", () => {
    expect(spec.section("Effort")).toContain(
      `After **${missesForHint} misses** on a task`,
    );
  });
});
