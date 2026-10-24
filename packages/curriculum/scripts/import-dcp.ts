// Imports one curriculum from the Ontario Digital Curriculum Platform (DCP)
// into the reference layer: the official text, for agents and humans to read
// while designing games. Apps never see it; see ../README.md and
// docs/adr/0001-two-layer-curriculum-package.md.
//
//   pnpm import-dcp --curriculum elementary___math --edition math-2020
//   pnpm import-dcp --curriculum elementary___math --edition math-2020 --from saved.json
//
// The DCP API is undocumented, so this makes one request per run. Use --from
// to re-run against a saved response instead of fetching again.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { htmlToText } from "./html-to-text.ts";
import {
  expectationId,
  type ReferenceCurriculum,
  type ReferenceElaboration,
  type ReferenceGrade,
  type ReferenceStrand,
} from "./reference.ts";

interface Element {
  type: string;
  value: unknown;
}

interface Item {
  system: { codename: string; type: string };
  elements: Record<string, Element>;
}

interface DcpResponse {
  item: Item;
  modular_content: Record<string, Item>;
}

const API = "https://ws.api.dcp.edu.gov.on.ca/content/api/items";

const { values: args } = parseArgs({
  options: {
    curriculum: { type: "string" },
    edition: { type: "string" },
    from: { type: "string" },
  },
});
if (!args.curriculum || !args.edition) {
  throw new Error(
    "Usage: import-dcp --curriculum <dcp codename> --edition <e.g. math-2020> [--from <saved response>]",
  );
}
const edition = args.edition;
const url = `${API}/${args.curriculum}?depth=8&language=en-CA`;

const response: DcpResponse = args.from
  ? JSON.parse(readFileSync(args.from, "utf8"))
  : await fetch(url).then((res) => {
      if (!res.ok) throw new Error(`${url} returned ${res.status}`);
      return res.json();
    });

function element(item: Item, key: string): Element {
  const found = item.elements[key];
  if (!found) throw new Error(`${item.system.codename} has no "${key}"`);
  return found;
}

const text = (item: Item, key: string) =>
  String(element(item, key).value ?? "").trim();
const richText = (item: Item, key: string) =>
  htmlToText(String(element(item, key).value ?? ""));

function linked(item: Item, key: string): Item[] {
  return (element(item, key).value as string[]).map((codename) => {
    const found = response.modular_content[codename];
    if (!found) {
      throw new Error(
        `${codename}, linked from ${item.system.codename}, is missing: raise the request depth`,
      );
    }
    return found;
  });
}

/** Strands sit inside nested page sections, so search everything under the course. */
function strandsOf(course: Item): Item[] {
  const strands: Item[] = [];
  const seen = new Set<string>();
  const walk = (item: Item) => {
    if (seen.has(item.system.codename)) return;
    seen.add(item.system.codename);
    if (item.system.type === "l3___strand") {
      strands.push(item);
      return;
    }
    if (
      item !== course &&
      ["l1___curriculum", "l2___course"].includes(item.system.type)
    )
      return;
    for (const el of Object.values(item.elements)) {
      const codenames =
        el.type === "modular_content"
          ? (el.value as string[])
          : el.type === "rich_text"
            ? ((el as { modular_content?: string[] }).modular_content ?? [])
            : [];
      for (const codename of codenames) {
        const child = response.modular_content[codename];
        if (child) walk(child);
      }
    }
  };
  walk(course);
  return strands;
}

const kebab = (label: string) =>
  label.toLowerCase().trim().replace(/\s+/g, "-");

/** Elaborations are linked directly or grouped in titled collections (e.g. "Sample tasks"). */
function elaborationsOf(specific: Item): ReferenceElaboration[] {
  const flatten = (
    item: Item,
    collectionTitle?: string,
  ): ReferenceElaboration[] => {
    if (item.system.type === "ui___content_collection") {
      return linked(item, "sections").flatMap((child) =>
        flatten(child, text(item, "title")),
      );
    }
    if (item.system.type !== "elaborations") return [];
    const [support] = element(item, "pedagogical_supports").value as {
      name: string;
    }[];
    const label = support?.name.split(" | ")[0] ?? collectionTitle ?? "other";
    return [{ kind: kebab(label), text: richText(item, "elaboration") }];
  };
  return linked(specific, "elaborations").flatMap((item) => flatten(item));
}

function importStrand(strand: Item, grade: number): ReferenceStrand {
  return {
    code: text(strand, "title_index"),
    title: text(strand, "title"),
    why: linked(strand, "why_is_this_learning_important")
      .map((why) => richText(why, "content"))
      .join("\n"),
    overall: linked(strand, "overall_expectations").map((overall) => ({
      code: text(overall, "title_index"),
      title: text(overall, "title"),
      text: richText(overall, "content"),
      specific: linked(overall, "specific_expectations")
        .filter(
          (specific) => specific.system.type === "l5___specific_expectation",
        )
        .map((specific) => {
          const code = text(specific, "title_index");
          return {
            id: expectationId(edition, grade, code),
            code,
            topic: text(specific, "title"),
            text: richText(specific, "content"),
            elaborations: elaborationsOf(specific),
          };
        }),
    })),
  };
}

const grades: ReferenceGrade[] = linked(response.item, "specific_courses").map(
  (course) => {
    const [gradeTag] = element(course, "site___grade").value as {
      name: string;
    }[];
    const grade = Number(gradeTag?.name);
    if (!Number.isInteger(grade))
      throw new Error(`${course.system.codename} has no grade`);
    const strands = strandsOf(course).map((strand) =>
      importStrand(strand, grade),
    );
    const codes = strands.map((strand) => strand.code);
    if (new Set(codes).size !== codes.length) {
      throw new Error(
        `Grade ${grade} has duplicate strands: ${codes.join(", ")}`,
      );
    }
    return {
      grade,
      strands: strands.sort((a, b) => a.code.localeCompare(b.code)),
    };
  },
);

const firstCourse = linked(response.item, "specific_courses")[0];
const curriculum: ReferenceCurriculum = {
  edition,
  subject: firstCourse ? text(firstCourse, "name") : edition,
  issued: text(response.item, "monarchs_printer_year"),
  source: url,
  importedAt: new Date().toISOString(),
  grades: grades.sort((a, b) => a.grade - b.grade),
};

const NOTICE =
  "Reference only. © King's Printer for Ontario. Never ship this text in the product; see packages/curriculum/README.md.";

const strandFile = (grade: ReferenceGrade, strand: ReferenceStrand) => {
  const words = strand.title.replace(/\(.*?\)/g, "").match(/[a-z]+/gi) ?? [];
  return `g${grade.grade}-${kebab([strand.code, ...words.slice(0, 3)].join(" "))}.md`;
};

function strandMarkdown(
  grade: ReferenceGrade,
  strand: ReferenceStrand,
): string {
  const out = [
    `# ${curriculum.subject} (${curriculum.issued}), Grade ${grade.grade}, ${strand.code}. ${strand.title}: official text`,
    "",
    NOTICE,
  ];
  if (strand.why) out.push("", strand.why);
  for (const overall of strand.overall) {
    out.push("", `## ${overall.code}. ${overall.title}`, "", overall.text);
    for (const specific of overall.specific) {
      out.push("", `### ${specific.id} (${specific.topic})`, "", specific.text);
      for (const elaboration of specific.elaborations) {
        out.push("", `${elaboration.kind}:`, elaboration.text);
      }
    }
  }
  return `${out.join("\n")}\n`;
}

/** Every expectation ID and topic, with the file holding its text: the place to start looking. */
function indexMarkdown(): string {
  const out = [
    `# ${curriculum.subject} (${curriculum.issued}): index`,
    "",
    NOTICE,
  ];
  for (const grade of curriculum.grades) {
    out.push("", `## Grade ${grade.grade}`);
    for (const strand of grade.strands) {
      out.push(
        "",
        `### ${strand.code}. ${strand.title} (${strandFile(grade, strand)})`,
        "",
      );
      for (const overall of strand.overall) {
        for (const specific of overall.specific)
          out.push(`- ${specific.id} (${specific.topic})`);
      }
    }
  }
  return `${out.join("\n")}\n`;
}

const outDir = new URL(`../reference/${edition}/`, import.meta.url);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(
  new URL(`../reference/${edition}.json`, import.meta.url),
  `${JSON.stringify(curriculum, null, 2)}\n`,
);
writeFileSync(new URL("index.md", outDir), indexMarkdown());
for (const grade of curriculum.grades) {
  for (const strand of grade.strands) {
    writeFileSync(
      new URL(strandFile(grade, strand), outDir),
      strandMarkdown(grade, strand),
    );
  }
}

const count = curriculum.grades.flatMap((g) =>
  g.strands.flatMap((s) => s.overall.flatMap((o) => o.specific)),
).length;
console.log(
  `Imported ${edition}: ${curriculum.grades.length} grades, ${count} specific expectations.`,
);
