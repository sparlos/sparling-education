// Maps the semantic text colours wrappers accept onto the `--k-*` variables.
export type InkColor =
  | "ink"
  | "muted"
  | "inverse"
  | "inverse-muted"
  | "tone"
  | "inherit";

export function inkVar(c: InkColor | undefined): string | undefined {
  switch (c) {
    case "ink":
      return "var(--k-ink)";
    case "muted":
      return "var(--k-ink-muted)";
    case "inverse":
      return "var(--k-ink-inverse)";
    case "inverse-muted":
      return "var(--k-ink-inverse-muted)";
    case "tone":
      return "var(--tone-text)";
    case "inherit":
      return "inherit";
    default:
      return undefined;
  }
}
