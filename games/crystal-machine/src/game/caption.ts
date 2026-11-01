// What a caption shows for a line said as fragments: the number family's
// fragments become the whole number in numerals, written as on screen
// (84 620), and a place said after a count is written lower case ("16
// tens"). A number ending a sentence gets its full stop. Plain text, so
// it's tested on its own.
import { numeral } from "../rules/teacher.ts";
import { isNumId, readNumber, type StringId } from "../strings.ts";

export function captionText(
  ids: readonly StringId[],
  t: (id: StringId) => string,
): string {
  const parts: string[] = [];
  let afterNumber = false;
  for (let i = 0; i < ids.length; ) {
    const id = ids[i] as StringId;
    if (isNumId(id)) {
      let j = i;
      while (j < ids.length && isNumId(ids[j] as string)) j++;
      parts.push(numeral(readNumber(ids.slice(i, j)) ?? 0));
      afterNumber = true;
      i = j;
      continue;
    }
    const text = t(id);
    if (afterNumber && id.startsWith("place.")) {
      parts.push(`${text.toLowerCase()}.`);
    } else {
      // A number before a new sentence (or at the end) ends its own.
      if (afterNumber && /^[A-Z]/.test(text)) parts[parts.length - 1] += ".";
      parts.push(text);
    }
    afterNumber = false;
    i++;
  }
  if (afterNumber) parts[parts.length - 1] += ".";
  return parts.join(" ");
}
