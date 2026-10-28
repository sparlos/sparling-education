// Every string a student sees or hears, by ID, exactly as SPEC.md's Strings
// table has them. Each gets a voice line from `pnpm voice`. Whole sentences
// are whole strings; an amount is its own string, joined by `say(...ids)`,
// so nothing needs interpolation.
export const denominators = [2, 3, 4, 5, 6, 8] as const;

const names: Record<(typeof denominators)[number], string> = {
  2: "one half",
  3: "one third",
  4: "one fourth",
  5: "one fifth",
  6: "one sixth",
  8: "one eighth",
};

export const fixedStrings = {
  title: "Template Game",
  intro: "Tap the bigger fraction.",
  "task.which": "Which one is bigger?",
  right: "Yes! That one is bigger.",
  wrong: "Not that one. Look at the size of each piece.",
  hint: "The smaller the bottom number, the bigger each piece.",
  done: "You did it!",
} as const;

export const fracId = (d: (typeof denominators)[number]) =>
  `frac.1-${d}` as const;

export const strings = {
  ...fixedStrings,
  ...(Object.fromEntries(denominators.map((d) => [fracId(d), names[d]])) as {
    [D in (typeof denominators)[number] as `frac.1-${D}`]: string;
  }),
};

export type StringId = keyof typeof strings;
