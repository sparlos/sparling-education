// Product layer for the Ontario Mathematics curriculum (2020): Kindling's own
// description of each expectation a game evidences, keyed by expectation ID,
// with a link to its official page on the DCP.
//
// Describe the whole expectation in plain words, written from what it means,
// never by editing the official wording (reference/math-2020/). Take the link
// from reference/math-2020.json, and check the ID against the DCP before
// merging. See ../README.md.
export const math2020 = {
  "math-2020.g3.B1.6": {
    description:
      "Solves fair-share problems with drawings: up to 20 items shared among 2 to 6, 8 or 10 people, with shares that come out as whole numbers, mixed numbers or fractions, and compares the results.",
    link: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g3-math/strand-b/b1#b1-6",
  },
  "math-2020.g3.B1.7": {
    description:
      "Solves fair-share problems that show two fractions can be the same amount, using eighths, fourths and halves; sixths and thirds; or tenths and fifths.",
    link: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g3-math/strand-b/b1#b1-7",
  },
  "math-2020.g3.B2.8": {
    description:
      "Shows with tools, drawings and fraction notation that the numerator counts unit fractions: three fifths is one fifth added three times.",
    link: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g3-math/strand-b/b2#b2-8",
  },
  "math-2020.g4.B1.4": {
    description:
      "Shows fractions from halves to tenths with drawings, tools and fraction notation, and explains what the numerator and denominator each mean.",
    link: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g4-math/strand-b/b1#b1-4",
  },
  "math-2020.g4.B1.5": {
    description:
      "Uses drawings and models to compare and order the share each person gets in two different fair-share problems, with 2 to 6, 8 or 10 sharers in each.",
    link: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g4-math/strand-b/b1#b1-5",
  },
  "math-2020.g4.B1.6": {
    description:
      "Counts up to 10 in unit fractions, halves to tenths (not sevenths or ninths), with or without tools: one fourth, two fourths, and on to forty fourths.",
    link: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g4-math/strand-b/b1#b1-6",
  },
  "math-2020.g5.B1.3": {
    description:
      "Finds and shows fractions that are equal in value, from halves to twelfths, including ones greater than one (improper fractions and mixed numbers), with tools and in different situations.",
    link: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g5-math/strand-b/b1#b1-3",
  },
  "math-2020.g5.B1.4": {
    description:
      "Compares fractions from halves to twelfths and puts them in order of size, including ones greater than one, as improper fractions or mixed numbers, in different situations.",
    link: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g5-math/strand-b/b1#b1-4",
  },
  "math-2020.g5.B2.5": {
    description:
      "Adds and subtracts fractions that have the same denominator, in different situations.",
    link: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g5-math/strand-b/b2#b2-5",
  },
} as const satisfies Record<string, { description: string; link: string }>;
