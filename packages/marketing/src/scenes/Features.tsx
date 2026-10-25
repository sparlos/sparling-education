// Feature cards that land one by one as the voice names each feature.
// Cues: each card on the first word of its label, so say the label.
import { radius, shadow } from "@repo/tokens";
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useBeat, usePop } from "../beat.tsx";
import { color, fonts, palette, toneOf } from "../brand.tsx";
import type { FeatureIcon, Scene } from "../brief.ts";

type Props = Extract<Scene, { kind: "features" }>;

const ink = palette.ink[9];
const iconStroke = {
  fill: "none",
  stroke: ink,
  strokeWidth: 4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const icons: Record<FeatureIcon, ReactNode> = {
  curriculum: (
    <>
      <rect
        x="12"
        y="8"
        width="40"
        height="48"
        rx="6"
        {...iconStroke}
        fill={palette.sand[0]}
      />
      <path
        d="M20 22 l4 4 l8 -8 M20 38 l4 4 l8 -8 M38 24 h6 M38 40 h6"
        {...iconStroke}
      />
    </>
  ),
  chromebook: (
    <>
      <rect
        x="12"
        y="12"
        width="40"
        height="28"
        rx="4"
        {...iconStroke}
        fill={palette.sky[1]}
      />
      <path d="M6 48 h52 l-4 6 h-44 z" {...iconStroke} fill={palette.ink[2]} />
    </>
  ),
  classroom: (
    <>
      <path d="M26 38 l-6 6 a8 8 0 0 1 -11 -11 l6 -6" {...iconStroke} />
      <path d="M38 26 l6 -6 a8 8 0 0 1 11 11 l-6 6" {...iconStroke} />
      <path d="M24 40 l16 -16" {...iconStroke} />
    </>
  ),
  chart: (
    <>
      <rect
        x="12"
        y="34"
        width="10"
        height="18"
        rx="2"
        {...iconStroke}
        fill={palette.leaf[3]}
      />
      <rect
        x="27"
        y="22"
        width="10"
        height="30"
        rx="2"
        {...iconStroke}
        fill={palette.sunshine[3]}
      />
      <rect
        x="42"
        y="12"
        width="10"
        height="40"
        rx="2"
        {...iconStroke}
        fill={palette.ember[3]}
      />
    </>
  ),
};

const bare = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function Features({ title, items }: Props) {
  const beat = useBeat();
  const { width, height } = useVideoConfig();
  const tone = toneOf(beat.tone);
  const titleIn = usePop(0, false);
  const unit = Math.min(width, height) / 40;
  // Each card lands when the voice reaches its label's first word.
  let after = 0;
  const froms = items.map((item, i) => {
    const first = bare(item.label.split(/\s+/)[0] ?? "");
    const k = beat.words.findIndex(
      (w, j) => j >= after && bare(w.text) === first,
    );
    if (k >= 0) {
      after = k + 1;
      return beat.wordFrame(k) - 4;
    }
    return beat.voiceFrom + Math.round((beat.voiceFrames * i) / items.length);
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        paddingBottom: height * 0.12,
        gap: unit * 2,
      }}
    >
      <div
        style={{
          fontFamily: fonts.heading,
          fontWeight: 900,
          fontSize: unit * 2.4,
          color: color.ink.default,
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * -unit * 3}px)`,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", gap: unit * 1.4 }}>
        {items.map((item, i) => (
          <Card
            key={item.label}
            {...item}
            from={froms[i] ?? 0}
            unit={unit}
            accent={
              [
                tone.soft,
                palette.sunshine[0],
                palette.sky[0],
                palette.berry[0],
              ][i % 4] ?? tone.soft
            }
            tilt={[-3, 2, -2, 3][i % 4] ?? 0}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}

function Card({
  icon,
  label,
  from,
  unit,
  accent,
  tilt,
}: {
  icon: FeatureIcon;
  label: string;
  from: number;
  unit: number;
  accent: string;
  tilt: number;
}) {
  const frame = useCurrentFrame();
  const pop = usePop(from);
  return (
    <div
      style={{
        width: unit * 11,
        padding: unit * 1.2,
        borderRadius: radius.xl,
        background: color.surface.raised,
        boxShadow: shadow.xl,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: unit * 0.8,
        opacity: frame < from ? 0 : 1,
        transform: `translateY(${(1 - pop) * unit * 8}px) scale(${0.5 + 0.5 * pop}) rotate(${tilt * pop}deg)`,
      }}
    >
      <div
        style={{
          width: unit * 5,
          height: unit * 5,
          borderRadius: radius.lg,
          background: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={unit * 3.4}
          height={unit * 3.4}
          viewBox="0 0 64 64"
          aria-hidden="true"
        >
          {icons[icon]}
        </svg>
      </div>
      <div
        style={{
          fontFamily: fonts.heading,
          fontWeight: 800,
          fontSize: unit * 1.15,
          lineHeight: 1.2,
          textAlign: "center",
          color: color.ink.default,
        }}
      >
        {label}
      </div>
    </div>
  );
}
