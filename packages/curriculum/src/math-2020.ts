// Product layer for the Ontario Mathematics curriculum (2020): the platform's own
// description of each expectation a game evidences, keyed by expectation ID,
// with a link to its official page on the DCP.
//
// Describe the whole expectation in plain words, written from what it means,
// never by editing the official wording (reference/math-2020/). Take the link
// from reference/math-2020.json, and check the ID against the DCP before
// merging. See ../README.md.
export const math2020 = {
  "math-2020.g3.B1.1": {
    description:
      "Reads and shows whole numbers to 1000 in many forms (words, numerals, expanded form, number lines, base ten blocks), builds them up and splits them apart in different ways, and talks about where people use numbers every day.",
    link: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g3-math/strand-b/b1#b1-1",
  },
  "math-2020.g3.B1.5": {
    description:
      "Describes and shows numbers with more than one digit by what each digit is worth in its place, including with base ten blocks: the 5 in 511 is worth 500, and a zero keeps a place empty.",
    link: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g3-math/strand-b/b1#b1-5",
  },
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
  "math-2020.g3.B2.5": {
    description:
      "Solves story problems that add or subtract whole numbers with totals up to 1000, whether the unknown is the result, the change or the start, using tools, models such as number lines and bar models, and written methods.",
    link: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g3-math/strand-b/b2#b2-5",
  },
  "math-2020.g3.B2.8": {
    description:
      "Shows with tools, drawings and fraction notation that the numerator counts unit fractions: three fifths is one fifth added three times.",
    link: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g3-math/strand-b/b2#b2-8",
  },
  "math-2020.g4.B1.1": {
    description:
      "Reads and shows whole numbers to 10 000 in many forms, builds them up and splits them apart in different ways (8621 as 7 thousands, 16 hundreds, 2 tens and 1 one), and talks about where people use numbers every day.",
    link: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g4-math/strand-b/b1#b1-1",
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
  "math-2020.g4.B2.4": {
    description:
      "Solves story problems that add or subtract whole numbers with totals up to 10 000, and decimals in tenths, choosing tools and strategies, the column method included.",
    link: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g4-math/strand-b/b2#b2-4",
  },
  "math-2020.g5.B1.1": {
    description:
      "Reads and shows whole numbers to 100 000 in many forms, expanded notation included, builds them up and splits them apart in different ways (10 620 as 106 hundreds and 20 ones), and talks about where people use numbers every day.",
    link: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g5-math/strand-b/b1#b1-1",
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
  "math-2020.g5.B2.4": {
    description:
      "Solves story problems that add or subtract whole numbers with totals up to 100 000, and decimals to hundredths, choosing tools and strategies, the column method included.",
    link: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g5-math/strand-b/b2#b2-4",
  },
  "math-2020.g5.B2.5": {
    description:
      "Adds and subtracts fractions that have the same denominator, in different situations.",
    link: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics/grades/g5-math/strand-b/b2#b2-5",
  },
} as const satisfies Record<string, { description: string; link: string }>;
