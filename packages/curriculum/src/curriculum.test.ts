import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { ReferenceCurriculum } from "../scripts/reference.ts";
import { expectation, expectationIds, parseExpectationId } from "./index.ts";

// Descriptions sharing this many consecutive words with the official text are
// probably edited copies of it, not Kindling's own words.
const COPIED_RUN = 6;

const references = new Map<string, Map<string, string>>();

function officialText(edition: string): Map<string, string> {
  let texts = references.get(edition);
  if (!texts) {
    const curriculum: ReferenceCurriculum = JSON.parse(
      readFileSync(
        new URL(`../reference/${edition}.json`, import.meta.url),
        "utf8",
      ),
    );
    texts = new Map();
    for (const grade of curriculum.grades) {
      for (const strand of grade.strands) {
        for (const overall of strand.overall) {
          for (const specific of overall.specific)
            texts.set(specific.id, specific.text);
        }
      }
    }
    references.set(edition, texts);
  }
  return texts;
}

const words = (text: string) => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

function runs(text: string, length: number): Set<string> {
  const list = words(text);
  const found = new Set<string>();
  for (let i = 0; i + length <= list.length; i++)
    found.add(list.slice(i, i + length).join(" "));
  return found;
}

test("every product-layer expectation exists in the reference layer", () => {
  for (const id of expectationIds) {
    assert.ok(
      officialText(parseExpectationId(id).edition).has(id),
      `${id} is not in the official curriculum`,
    );
  }
});

test("descriptions are Kindling's own words", () => {
  for (const id of expectationIds) {
    const { edition, description } = expectation(id);
    assert.ok(description.trim(), `${id} has no description`);
    const official = runs(officialText(edition).get(id) ?? "", COPIED_RUN);
    const copied = [...runs(description, COPIED_RUN)].find((run) =>
      official.has(run),
    );
    assert.equal(
      copied,
      undefined,
      `${id}'s description copies the official wording: "${copied}"`,
    );
  }
});

test("reference expectation IDs are unique and parse", () => {
  const curriculum: ReferenceCurriculum = JSON.parse(
    readFileSync(
      new URL("../reference/math-2020.json", import.meta.url),
      "utf8",
    ),
  );
  const ids = curriculum.grades.flatMap((g) =>
    g.strands.flatMap((s) =>
      s.overall.flatMap((o) => o.specific.map((e) => e.id)),
    ),
  );
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) parseExpectationId(id);
});
