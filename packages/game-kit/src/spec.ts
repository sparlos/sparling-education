// Tests that read a game's SPEC.md (written by `design-game` from its
// SPEC-TEMPLATE.md) and fail when the code drifts from the spec, or the spec
// from the code. Run them in the node environment:
//
//   // @vitest-environment node
//   const spec = readSpec(new URL("../SPEC.md", import.meta.url));
//   describeManifestSpec(spec, manifest);
//
// Then add the game's own checks: its rules' numbers (thresholds, the help
// ladder, tasks per play) quoted from the spec's prose, and its strings.
import { readFileSync } from "node:fs";
import type { GameManifest } from "@repo/game-contract";
import { describe, expect, it } from "vitest";

export interface Spec {
  /** The whole file. */
  text: string;
  /** The text of a `## heading` section, up to the next one. Throws if it's missing. */
  section(heading: string): string;
  /** A header field's first word: `field("Slug")` for "Slug: my-game (game link: …)". */
  field(name: string): string | undefined;
}

export function readSpec(url: URL): Spec {
  const text = readFileSync(url, "utf8");
  return {
    text,
    section(heading) {
      const start = text.indexOf(`\n## ${heading}\n`);
      if (start < 0) throw new Error(`SPEC.md has no "${heading}" section`);
      const rest = text.slice(start + heading.length + 5);
      const end = rest.indexOf("\n## ");
      return end < 0 ? rest : rest.slice(0, end);
    },
    field(name) {
      return new RegExp(`^${name}: (\\S+)`, "m").exec(text)?.[1];
    },
  };
}

/** The backticked codes in a list: "`a`, `b`" is ["a", "b"]. */
export const codes = (list: string) =>
  [...list.matchAll(/`([^`]+)`/g)].map(([, code]) => code as string);

/** The `### heading` subsections of a section, with their bodies, in order. */
export function subsections(
  section: string,
): { heading: string; body: string }[] {
  return [
    ...section.matchAll(/^### (.+)\n([\s\S]*?)(?=\n### |$(?![\s\S]))/gm),
  ].map(([, heading = "", body = ""]) => ({ heading, body }));
}

/**
 * The Strings table's single-string rows, `| \`id\` | text |`, by ID. Rows
 * for a family of strings (`amount.<n>-<d>`, `hop.2` … `hop.12`) aren't
 * plain IDs, so they're left out for the game's own test to check.
 */
export function stringRows(spec: Spec): Record<string, string> {
  return Object.fromEntries(
    [
      ...spec.section("Strings").matchAll(/^\| `([a-z0-9.-]+)` \| (.+) \|$/gm),
    ].map(([, id, text]) => [id, text]),
  );
}

/**
 * Registers tests that the manifest matches the spec's header, Tiers,
 * Misconceptions and Teacher card: slug, version, renderer, avatar use, each
 * tier's grade and expectations, and each misconception's expectations and
 * description, all in order.
 */
export function describeManifestSpec(spec: Spec, manifest: GameManifest) {
  describe("the manifest matches SPEC.md", () => {
    it("has its slug, version, renderer and avatar use", () => {
      expect(spec.field("Slug")).toBe(manifest.slug);
      expect(spec.field("Version")).toBe(String(manifest.version));
      expect(spec.field("Renderer")).toBe(manifest.renderer);
      expect(spec.field("Avatar")).toBe(manifest.avatar);
    });

    it("has its description for the try site", () => {
      const line = /^Description: (.+)$/m.exec(spec.text)?.[1];
      expect(line, "SPEC.md needs a Description: line").toBeDefined();
      expect(manifest.description).toBe(line);
    });

    it("has each tier's grade and expectations", () => {
      const tiers = subsections(spec.section("Tiers")).map(
        ({ heading, body }) => {
          const [, id, grade] = /^(\S+): Grade (\d+)$/.exec(heading) ?? [];
          const list = /- Expectations: (.+)/.exec(body)?.[1] ?? "";
          return { id, grade: Number(grade), expectations: codes(list) };
        },
      );
      expect(tiers).toEqual(
        Object.entries(manifest.tiers).map(([id, tier]) => ({
          id,
          grade: tier.grade,
          expectations: [...tier.expectations],
        })),
      );
    });

    it("has each misconception and the expectations it belongs to", () => {
      const found = subsections(spec.section("Misconceptions")).map(
        ({ heading, body }) => ({
          id: codes(heading)[0],
          expectations: codes(/- Expectations: (.+)/.exec(body)?.[1] ?? ""),
        }),
      );
      expect(found).toEqual(
        Object.entries(manifest.misconceptions).map(([id, m]) => ({
          id,
          expectations: [...m.expectations],
        })),
      );
    });

    it("describes each misconception to teachers in the teacher card's words", () => {
      // `- \`id\`: "The wrong idea." Reteach: …`
      const described = Object.fromEntries(
        [
          ...spec
            .section("Teacher card")
            .matchAll(/^\s+- `([^`]+)`(?: \([^)]*\))?: "([^"]+)"/gm),
        ].map(([, id, description]) => [id, description]),
      );
      expect(described).toEqual(
        Object.fromEntries(
          Object.entries(manifest.misconceptions).map(([id, m]) => [
            id,
            m.description,
          ]),
        ),
      );
    });
  });
}
