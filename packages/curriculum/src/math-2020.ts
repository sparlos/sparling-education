// Product layer for the Ontario Mathematics curriculum (2020): Kindling's own
// description of each expectation a game evidences, keyed by expectation ID.
//
// Write each description from what the expectation means, never by editing
// the official wording (reference/math-2020/), and check the ID against the
// DCP before merging. See ../README.md.
export const math2020 = {
  "math-2020.g3.B1.6":
    "Shares a number of wholes equally among up to 10 people and describes each share, whether it comes out whole, fractional or as a mixed number.",
  "math-2020.g3.B1.7":
    "Finds that two different fractions can name the same share, such as one half and four eighths, or one fifth and two tenths.",
  "math-2020.g3.B2.8":
    "Understands the top number of a fraction as a count of equal unit pieces, so three fifths is one fifth taken three times.",
  "math-2020.g4.B1.4":
    "Shows fractions from halves to tenths with models and symbols, and explains that the bottom number sets the size of each part and the top number counts the parts.",
  "math-2020.g4.B1.5":
    "Compares and orders the shares that come from two different equal-sharing situations, reasoning about how many wholes and how many people.",
  "math-2020.g4.B1.6":
    "Counts on by a unit fraction past one whole, for example one fourth, two fourths and on to eleven fourths, with or without a model.",
  "math-2020.g5.B1.3":
    "Makes and recognises equal-value fractions up to twelfths by splitting or merging parts, including fractions greater than one written as improper fractions or mixed numbers.",
  "math-2020.g5.B1.4":
    "Puts fractions up to twelfths in order of size, those greater than one too (improper or mixed), using strategies like common parts, common counts and the one-half benchmark.",
  "math-2020.g5.B2.5":
    "Adds and subtracts fractions that share a denominator by combining or comparing counts of the same unit piece.",
} as const satisfies Record<string, string>;
