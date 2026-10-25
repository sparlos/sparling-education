// Puts the aligner's word times onto the caption's own words. The caption is
// always the beat's `vo`, exactly as written (punctuation, capitals, "Ontario's"),
// while the aligner returns bare words of what the model was told to say
// (`say`, if the beat has one). Words are matched by their bare form (longest
// common subsequence); a caption word with no match shares the gap between
// its matched neighbours.

import type { Word } from "./timeline.ts";

export interface AlignedWord {
  text: string;
  /** Seconds. */
  start: number;
  end: number;
}

const bare = (word: string) =>
  word
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "");

/** The caption's words: whitespace-separated, punctuation kept on the word. */
export function captionWords(vo: string): string[] {
  return vo.split(/\s+/).filter((w) => bare(w) !== "" || /\S/.test(w));
}

/** Caption words with times, and how many were matched to a timed word. */
export function mapWords(
  vo: string,
  aligned: AlignedWord[],
  durationMs: number,
): { words: Word[]; matched: number } {
  const words = captionWords(vo);
  const a = words.map(bare);
  const b = aligned.map((w) => bare(w.text));
  // LCS table, flat: cell (i, j) at i * cols + j.
  const cols = b.length + 1;
  const lcs = new Int32Array((a.length + 1) * cols);
  const at = (i: number, j: number) => lcs[i * cols + j] ?? 0;
  const same = (i: number, j: number) => a[i] !== "" && a[i] === b[j];
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i * cols + j] = same(i, j)
        ? at(i + 1, j + 1) + 1
        : Math.max(at(i + 1, j), at(i, j + 1));
  const match = new Array<AlignedWord | undefined>(words.length);
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (same(i, j)) {
      match[i] = aligned[j];
      i++;
      j++;
    } else if (at(i + 1, j) >= at(i, j + 1)) i++;
    else j++;
  }

  const out: Word[] = words.map((text, i) => {
    const m = match[i];
    return m
      ? { text, startMs: m.start * 1000, endMs: m.end * 1000 }
      : { text, startMs: Number.NaN, endMs: Number.NaN };
  });
  // Share each run of unmatched words across the gap around it.
  const unmatched = (i: number) => Number.isNaN(out[i]?.startMs);
  for (let i = 0; i < out.length; ) {
    if (!unmatched(i)) {
      i++;
      continue;
    }
    let j = i;
    while (j < out.length && unmatched(j)) j++;
    const from = out[i - 1]?.endMs ?? 0;
    const to = out[j]?.startMs ?? durationMs;
    const step = (to - from) / (j - i);
    out.slice(i, j).forEach((w, k) => {
      w.startMs = from + step * k;
      w.endMs = from + step * (k + 1);
    });
    i = j;
  }
  // Monotonic, and each word lasts until the next starts if the gap is short
  // (captions shouldn't flicker between words).
  out.forEach((w, i) => {
    const prev = out[i - 1];
    if (prev && w.startMs < prev.endMs) w.startMs = prev.endMs;
    if (w.endMs < w.startMs) w.endMs = w.startMs;
  });
  out.forEach((w, i) => {
    const next = out[i + 1];
    if (next && next.startMs - w.endMs < 250) w.endMs = next.startMs;
    w.startMs = Math.round(w.startMs);
    w.endMs = Math.round(w.endMs);
  });
  return { words: out, matched: match.filter(Boolean).length };
}
