// Converts the DCP's rich-text HTML into plain text an agent can read:
// nested lists become indented bullets and images become their alt text.

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decode(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, ref: string) => {
    if (!ref.startsWith("#")) return ENTITIES[ref.toLowerCase()] ?? match;
    const hex = ref[1] === "x" || ref[1] === "X";
    return String.fromCodePoint(
      Number.parseInt(ref.slice(hex ? 2 : 1), hex ? 16 : 10),
    );
  });
}

const BLOCKS = new Set([
  "p",
  "br",
  "div",
  "figure",
  "table",
  "tr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

export function htmlToText(html: string): string {
  const lines: string[] = [];
  let line = "";
  let indent = "";
  let depth = 0;

  const flush = () => {
    const text = line.replace(/\s+/g, " ").trim();
    if (text) lines.push(indent + text);
    line = "";
    indent = "";
  };

  for (const [, closing, tag = "", attrs = "", text] of html.matchAll(
    /<(\/?)(\w+)([^>]*)>|([^<]+)/g,
  )) {
    if (text !== undefined) {
      line += decode(text);
      continue;
    }
    const name = tag.toLowerCase();
    if (name === "ul" || name === "ol") {
      flush();
      depth += closing ? -1 : 1;
    } else if (name === "li") {
      flush();
      if (!closing) indent = `${"  ".repeat(Math.max(depth - 1, 0))}- `;
    } else if (name === "sup" && !closing) {
      line += "^";
    } else if (name === "img") {
      const alt = /alt="([^"]*)"/.exec(attrs)?.[1];
      if (alt) line += ` [image: ${decode(alt)}] `;
    } else if (name === "object" && !closing) {
      line += " [linked content omitted] ";
    } else if (BLOCKS.has(name)) {
      flush();
    }
  }
  flush();
  return lines.join("\n");
}
