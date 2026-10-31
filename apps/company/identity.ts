// The company identity: ink and paper, with a brass accent. Kept apart from
// @repo/tokens on purpose: the product appears on this site as a guest, and
// a product rename never touches the company. The layout publishes these as
// CSS variables (--ink, --paper, …) for the CSS modules.

export const companyColour = {
  /** Headings, body text and the monogram's square. */
  ink: "#14213D",
  /** Secondary text. */
  inkSoft: "#3A4560",
  /** Small print. */
  inkMuted: "#5B6479",
  /** The page. */
  paper: "#FBF8F2",
  /** Hairlines between columns. */
  rule: "#E3DACB",
  /** The printed rules, underlines and the monogram's bar. Shapes only, never text. */
  brass: "#B8893A",
  /** Keyboard focus ring. */
  focus: "#1E40AF",
} as const;

const kebab = (name: string) =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** `companyColour` as CSS custom properties, e.g. `--ink-soft`. */
export const companyColourVariables = Object.fromEntries(
  Object.entries(companyColour).map(([name, value]) => [
    `--${kebab(name)}`,
    value,
  ]),
);
