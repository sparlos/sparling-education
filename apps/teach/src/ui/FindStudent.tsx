// Finding a student by name, in the browser: the box, and what it matches.
import { TextInput } from "@repo/ui/text-input";

export function FindStudent({
  query,
  onQuery,
  hideLabel,
  className,
}: {
  query: string;
  onQuery(query: string): void;
  hideLabel?: boolean;
  className?: string;
}) {
  return (
    <TextInput
      label="Find a student"
      hideLabel={hideLabel}
      name="find-student"
      type="search"
      autoComplete="off"
      value={query}
      onChange={onQuery}
      className={className}
    />
  );
}

/** Whether a student's first name, or last initial, starts with what's typed. */
export function matchesName(
  { firstName, lastInitial }: { firstName: string; lastInitial: string },
  query: string,
) {
  const words = plain(query).split(/\s+/).filter(Boolean);
  const names = plain(`${firstName} ${lastInitial}`).split(/\s+/);
  return words.every((word) => names.some((name) => name.startsWith(word)));
}

/** Lower case, without accents or a trailing dot: "Zoé L." reads as "zoe l". */
function plain(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\./g, "")
    .toLowerCase();
}

/** What's said when no one matches. */
export function noMatch(query: string) {
  return `No student's name starts with "${query.trim()}".`;
}
