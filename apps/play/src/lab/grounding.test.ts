// @vitest-environment node
// Every prototype stays grounded: it targets expectations that exist in the
// official curriculum, and names misconceptions it should make fail.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { prototypes } from "./registry.ts";

interface Reference {
  grades: {
    strands: { overall: { specific: { id: string }[] }[] }[];
  }[];
}

// The IDs in each edition, or undefined if it hasn't been imported.
const editions = new Map<string, Set<string> | undefined>();

function referenceIds(edition: string): Set<string> | undefined {
  if (!editions.has(edition)) {
    let ids: Set<string> | undefined;
    try {
      const reference: Reference = JSON.parse(
        readFileSync(
          new URL(
            `../../../../packages/curriculum/reference/${edition}.json`,
            import.meta.url,
          ),
          "utf8",
        ),
      );
      ids = new Set(
        reference.grades.flatMap((grade) =>
          grade.strands.flatMap((strand) =>
            strand.overall.flatMap((overall) =>
              overall.specific.map((specific) => specific.id),
            ),
          ),
        ),
      );
    } catch {
      ids = undefined;
    }
    editions.set(edition, ids);
  }
  return editions.get(edition);
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const misconceptionPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

test("the lab has at least one prototype", () => {
  expect(Object.keys(prototypes).length).toBeGreaterThan(0);
});

describe.each(Object.entries(prototypes))("%s", (slug, { meta }) => {
  test("has a slug that works as a path", () => {
    expect(slug).toMatch(slugPattern);
  });

  test("says what it is and why it might be fun", () => {
    expect(meta.title.trim()).not.toBe("");
    expect(meta.pitch.trim()).not.toBe("");
    expect(meta.fun.trim()).not.toBe("");
  });

  test("targets expectations that exist in the reference layer", () => {
    expect(meta.expectations.length).toBeGreaterThan(0);
    for (const id of meta.expectations) {
      const edition = id.split(".")[0] ?? "";
      const ids = referenceIds(edition);
      expect(
        ids,
        `${id}: no reference layer for "${edition}". Ask a human to import it`,
      ).toBeDefined();
      expect(ids?.has(id), `${id} is not in the official curriculum`).toBe(
        true,
      );
    }
    expect(new Set(meta.expectations).size).toBe(meta.expectations.length);
  });

  test("names misconceptions it should make visibly fail", () => {
    expect(meta.misconceptions.length).toBeGreaterThan(0);
    for (const { id, fails } of meta.misconceptions) {
      expect(id).toMatch(misconceptionPattern);
      expect(fails.trim(), `${id} doesn't say how it fails`).not.toBe("");
    }
    const ids = meta.misconceptions.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("cites a sample task from one of its expectations", () => {
    if (!meta.sampleTask) return;
    expect(
      meta.expectations.some((id) => meta.sampleTask?.includes(id)),
      "name the expectation the sample task comes from",
    ).toBe(true);
  });
});
