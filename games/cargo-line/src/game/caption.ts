// What a caption shows for a line said as fragments: the number family's
// fragments become the number in numerals, written as on screen (57 903,
// 2.18). A number ending a sentence gets its full stop. Plain text, so
// it's tested on its own.
import { isNumId, readIds, type StringId } from "../strings.ts";

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
      parts.push(readIds(ids.slice(i, j)) ?? "");
      afterNumber = true;
      i = j;
      continue;
    }
    const text = t(id);
    // A number before a new sentence ends its own.
    if (afterNumber && /^[A-Z]/.test(text)) parts[parts.length - 1] += ".";
    parts.push(text);
    afterNumber = false;
    i++;
  }
  if (afterNumber) parts[parts.length - 1] += ".";
  return parts.join(" ");
}
