// The reveal: the gem bounces in, sparkles burst off it, the name lands
// letter by letter and the tagline rises under it.
// Cues: the product's name (the mark lands just before it).
import { Star } from "@remotion/shapes";
import { brandName } from "@repo/tokens";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useBeat, usePop, useRamp } from "../beat.tsx";
import { color, fonts, Mark, palette, toneOf } from "../brand.tsx";
import type { Scene } from "../brief.ts";

type Props = Extract<Scene, { kind: "logo" }>;

const name = brandName;
const sparkColors = [
  color.sparkle,
  palette.violet[4],
  color.sparkle,
  palette.violet[2],
  palette.violet[6],
];

export function Logo({ tagline }: Props) {
  const beat = useBeat();
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const at = Math.max(0, beat.cue(name, 0.3) - 8);
  const mark = usePop(at);
  const burst = useRamp(at + 4, at + 30);
  const size = Math.min(width, height) * 0.2;
  const taglineIn = usePop(at + 22, false);
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        paddingBottom: height * 0.1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: size * 0.3 }}>
        <div style={{ position: "relative" }}>
          {sparkColors.flatMap((c, i) =>
            [0, 1].map((j) => {
              const angle = ((i * 2 + j) / 10) * Math.PI * 2 + 0.3;
              const dist = size * (0.6 + burst * (1.1 + j * 0.5));
              return (
                <div
                  key={`${c}${j}`}
                  style={{
                    position: "absolute",
                    left: size / 2 + Math.cos(angle) * dist - 20,
                    top: size / 2 + Math.sin(angle) * dist - 20,
                    opacity: frame < at + 4 ? 0 : 1 - burst,
                    transform: `scale(${1 - burst * 0.6}) rotate(${burst * 180}deg)`,
                  }}
                >
                  <Star
                    points={4}
                    innerRadius={8}
                    outerRadius={20 + j * 8}
                    fill={c}
                  />
                </div>
              );
            }),
          )}
          <div
            style={{
              transform: `scale(${mark}) rotate(${(1 - mark) * -40}deg)`,
              opacity: frame < at ? 0 : 1,
            }}
          >
            <Mark size={size} />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: fonts.heading,
            fontWeight: 800,
            fontSize: size * 0.95,
            letterSpacing: -size * 0.03,
            color: color.ink.default,
          }}
        >
          {[...name].map((ch, i) => (
            <Letter
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed letters.
              key={i}
              ch={ch}
              from={at + 6 + i * 2}
              size={size}
            />
          ))}
        </div>
      </div>
      <div
        style={{
          marginTop: size * 0.25,
          fontFamily: fonts.heading,
          fontWeight: 800,
          fontSize: size * 0.3,
          color: toneOf(beat.tone).text,
          opacity: frame < at + 22 ? 0 : taglineIn,
          transform: `translateY(${(1 - taglineIn) * 30}px)`,
        }}
      >
        {tagline}
      </div>
    </AbsoluteFill>
  );
}

function Letter({
  ch,
  from,
  size,
}: {
  ch: string;
  from: number;
  size: number;
}) {
  const frame = useCurrentFrame();
  const pop = usePop(from);
  return (
    <span
      style={{
        display: "inline-block",
        opacity: frame < from ? 0 : 1,
        transform: `translateY(${(1 - pop) * -size * 0.6}px) scaleY(${0.7 + 0.3 * pop})`,
        transformOrigin: "50% 100%",
      }}
    >
      {ch}
    </span>
  );
}
