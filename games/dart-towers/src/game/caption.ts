// What a caption shows for a line said as fragments: the number family's
// fragments become one number in numerals, and "times", "plus" and "is" become
// ×, + and =, as on screen. A number ending a sentence gets its full stop.
import { numeral } from "../rules/teacher.ts";
import { isNumId, readNumber, type StringId } from "../strings.ts";

const symbols: Partial<Record<StringId, string>> = {
  "op.times": "×",
  "op.plus": "+",
  "op.is": "=",
};

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
    const symbol = symbols[id];
    if (symbol) {
      parts.push(symbol);
      afterNumber = false;
    } else {
      // A number before a new sentence ends its own.
      if (afterNumber) parts[parts.length - 1] += ".";
      parts.push(t(id));
      afterNumber = false;
    }
    i++;
  }
  if (afterNumber) parts[parts.length - 1] += ".";
  return parts.join(" ");
}
