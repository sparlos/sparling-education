// Big type, word by word: each word pops in as the voice says it (or on a
// stagger, for words the voice doesn't say). `*word*` takes the accent colour
// and a hand-drawn underline.
import { evolvePath } from "@remotion/paths";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useBeat, usePop, useRamp } from "../beat.tsx";
import { color, fonts, toneOf } from "../brand.tsx";
import type { Scene } from "../brief.ts";

type Props = Extract<Scene, { kind: "kinetic" }>;

const bare = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function Kinetic({ lines, eyebrow }: Props) {
  const beat = useBeat();
  const { width, height } = useVideoConfig();
  const tone = toneOf(beat.tone);
  // Match each displayed word to the next spoken word with the same spelling.
  let cursor = 0;
  let k = 0;
  const parsed = lines.map((line) =>
    line.split(/\s+/).map((raw) => {
      const accent = /^\*.*\*[^\w]*$/.test(raw);
      const text = raw.replace(/\*/g, "");
      const i = beat.words.findIndex(
        (w, j) => j >= cursor && bare(w.text) === bare(text),
      );
      const from = i >= 0 ? beat.wordFrame(i) - 3 : beat.voiceFrom - 6 + k * 4;
      if (i >= 0) cursor = i + 1;
      k++;
      return { text, accent, from };
    }),
  );
  const longest = Math.max(...lines.map((l) => l.replace(/\*/g, "").length));
  const size = Math.min(
    (width * 0.84) / (longest * 0.56),
    height * (lines.length > 2 ? 0.15 : 0.2),
  );
  const eyebrowIn = usePop(0);
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        paddingBottom: height * 0.08,
      }}
    >
      {eyebrow && (
        <div
          style={{
            fontFamily: fonts.body,
            fontWeight: 800,
            fontSize: size * 0.26,
            letterSpacing: size * 0.02,
            textTransform: "uppercase",
            color: tone.text,
            marginBottom: size * 0.2,
            opacity: eyebrowIn,
            transform: `translateY(${(1 - eyebrowIn) * 20}px)`,
          }}
        >
          {eyebrow}
        </div>
      )}
      {parsed.map((words, li) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed lines.
          key={li}
          style={{
            display: "flex",
            gap: size * 0.24,
            fontFamily: fonts.heading,
            fontWeight: 800,
            fontSize: size,
            lineHeight: 1.08,
            letterSpacing: -size * 0.025,
            color: color.ink.default,
          }}
        >
          {words.map((w, wi) => (
            <PopWord
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed words.
              key={wi}
              {...w}
              size={size}
              accentColor={tone.fill}
            />
          ))}
        </div>
      ))}
    </AbsoluteFill>
  );
}

function PopWord({
  text,
  accent,
  from,
  size,
  accentColor,
}: {
  text: string;
  accent: boolean;
  from: number;
  size: number;
  accentColor: string;
}) {
  const frame = useCurrentFrame();
  const pop = usePop(from);
  const draw = useRamp(from + 6, from + 20);
  const underline = "M4 18 C 60 6, 140 4, 196 14";
  const evolved = evolvePath(draw, underline);
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        color: accent ? accentColor : undefined,
        opacity: frame < from ? 0 : Math.min(1, pop * 1.5),
        transform: `translateY(${(1 - pop) * size * 0.35}px) scale(${0.6 + 0.4 * pop}) rotate(${(1 - pop) * -6}deg)`,
        transformOrigin: "50% 80%",
      }}
    >
      {text}
      {accent && (
        <svg
          aria-hidden="true"
          viewBox="0 0 200 24"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            left: "-2%",
            bottom: -size * 0.12,
            width: "104%",
            height: size * 0.2,
            overflow: "visible",
          }}
        >
          <path
            d={underline}
            fill="none"
            stroke={color.sparkle}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={evolved.strokeDasharray}
            strokeDashoffset={evolved.strokeDashoffset}
          />
        </svg>
      )}
    </span>
  );
}
