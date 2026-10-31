// The platform's curriculum data: the product layer. Expectation IDs and
// The platform's own descriptions, for game manifests, results, the teacher view
// and quick assess. The official text lives in ../reference/ for agents and
// humans designing games, and is deliberately not exported.
// See docs/adr/0001-two-layer-curriculum-package.md.
import { math2020 } from "./math-2020.ts";

export { type LearningSkill, learningSkills } from "./learning-skills.ts";

const descriptions = { ...math2020 } as const;

/** e.g. "math-2020.g4.B1.5": edition, grade and the curriculum's own code. */
export type ExpectationId = keyof typeof descriptions;

export interface Expectation {
  id: ExpectationId;
  /** The curriculum and its edition, e.g. "math-2020". */
  edition: string;
  grade: number;
  /** e.g. "B" */
  strand: string;
  /** e.g. "B1.5" */
  code: string;
  /** our own words; never the ministry's. */
  description: string;
  /** Its official page on the DCP, where teachers read the ministry's wording. */
  link: string;
}

const ID = /^([a-z]+-\d{4})\.g(\d)\.(([A-Z])\d+(?:\.\d+)?)$/;

export function parseExpectationId(id: string) {
  const match = ID.exec(id);
  if (!match) throw new Error(`Not an expectation ID: ${id}`);
  const [, edition = "", grade = "", code = "", strand = ""] = match;
  return { edition, grade: Number(grade), strand, code };
}

export const expectationIds = Object.keys(descriptions) as ExpectationId[];

export function expectation(id: ExpectationId): Expectation {
  return { id, ...parseExpectationId(id), ...descriptions[id] };
}
