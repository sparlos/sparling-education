// Baked-in captions: the voice-over's exact words, a few at a time, each
// word lighting up as it's spoken. Pages break at punctuation or when a line
// gets long, and never run across beats. A page stays up until the next one
// starts, or (the last in its beat) until the beat's scene starts to leave,
// so it can be read to the end. Beats whose words are on screen skip them.
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { usePop } from "./beat.tsx";
import { color, fonts, palette } from "./brand.tsx";
import type { Beat } from "./brief.ts";
import type { Timeline } from "./timeline.ts";

interface CaptionWord {
  text: string;
  from: number;
  to: number;
}

interface Page {
  words: CaptionWord[];
  from: number;
  to: number;
}

const maxChars = 26;

/** Captions by default, except where the scene already shows the words. */
export function captioned(beat: Beat) {
  return beat.captions ?? beat.scene.kind !== "kinetic";
}

export function pages(timeline: Timeline): Page[] {
  const fps = timeline.fps;
  const out: Page[] = [];
  timeline.beats.forEach((placed, b) => {
    if (!captioned(placed.beat)) return;
    // The beat's scene starts to leave when the next transition starts.
    const next = timeline.beats[b + 1];
    const leaves = next ? next.from : placed.from + placed.durationInFrames;
    const beatPages: Page[] = [];
    const words = placed.take.words.map((w) => ({
      text: w.text,
      from: placed.voiceFrom + Math.round((w.startMs / 1000) * fps),
      to: placed.voiceFrom + Math.round((w.endMs / 1000) * fps),
    }));
    let page: CaptionWord[] = [];
    const flush = () => {
      const first = page[0];
      const last = page.at(-1);
      if (first && last)
        beatPages.push({ words: page, from: first.from, to: last.to });
      page = [];
    };
    for (const w of words) {
      const len = [...page, w].map((x) => x.text).join(" ").length;
      if (page.length && len > maxChars) flush();
      page.push(w);
      if (/[.!?,:;—]$/.test(w.text)) flush();
    }
    flush();
    beatPages.forEach((page, i) => {
      page.to = Math.max(
        page.to,
        beatPages[i + 1]?.from ?? leaves - fps * 0.15,
      );
    });
    out.push(...beatPages);
  });
  return out;
}

export function Captions({ timeline }: { timeline: Timeline }) {
  const frame = useCurrentFrame();
  const page = pages(timeline).find((p) => frame >= p.from && frame < p.to + 4);
  if (!page) return null;
  return <CaptionPage key={page.from} page={page} />;
}

function CaptionPage({ page }: { page: Page }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const pop = usePop(page.from - 2);
  const size = Math.round(Math.min(width, height) * 0.052);
  const out = frame > page.to ? (frame - page.to) / 4 : 0;
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: height * 0.07,
      }}
    >
      <div
        style={{
          fontFamily: fonts.heading,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.1,
          padding: `${size * 0.28}px ${size * 0.5}px`,
          borderRadius: size * 0.45,
          background: color.surface.inverse,
          color: color.ink.inverse,
          boxShadow: `0 ${size * 0.12}px 0 ${palette.ink[7]}`,
          transform: `translateY(${(1 - pop) * size * 0.6}px) scale(${0.85 + 0.15 * pop})`,
          opacity: Math.min(1, pop * 2) * (1 - out),
          maxWidth: width * 0.8,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          columnGap: size * 0.32,
        }}
      >
        {page.words.map((w, i) => {
          const spoken = frame >= w.from;
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: words repeat; order is stable.
              key={i}
              style={{
                display: "inline-block",
                color: spoken ? palette.sunshine[3] : color.ink.inverse,
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
