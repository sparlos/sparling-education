// The shape of the reference layer: official curriculum text imported from the
// DCP. Read by agents, humans and this package's tests; never by apps.

export interface ReferenceCurriculum {
  /** e.g. "math-2020"; the prefix of every expectation ID. */
  edition: string;
  subject: string;
  /** The King's Printer year the DCP gives for this curriculum. */
  issued: string;
  source: string;
  importedAt: string;
  grades: ReferenceGrade[];
}

export interface ReferenceGrade {
  grade: number;
  strands: ReferenceStrand[];
}

export interface ReferenceStrand {
  /** e.g. "B" */
  code: string;
  title: string;
  /** The DCP's "why is this learning important" text for this strand and grade. */
  why: string;
  overall: ReferenceOverallExpectation[];
}

export interface ReferenceOverallExpectation {
  /** e.g. "B1" */
  code: string;
  title: string;
  text: string;
  specific: ReferenceSpecificExpectation[];
}

export interface ReferenceSpecificExpectation {
  /** e.g. "math-2020.g4.B1.5": the ID the product layer and results use. */
  id: string;
  /** e.g. "B1.5" */
  code: string;
  /** The DCP's topic heading, e.g. "Fractions and Decimals". */
  topic: string;
  text: string;
  /**
   * Its page on the DCP's public site, anchored at the expectation, e.g.
   * ".../grades/g4-math/strand-b/b1#b1-5": where teachers read the official
   * wording, which the platform links to and never reproduces.
   */
  link: string;
  elaborations: ReferenceElaboration[];
}

export interface ReferenceElaboration {
  /** e.g. "examples", "key-concepts", "sample-tasks" */
  kind: string;
  text: string;
}

export function expectationId(edition: string, grade: number, code: string) {
  return `${edition}.g${grade}.${code}`;
}
