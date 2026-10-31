// A whole class: every student's avatar and nickname pops in across the
// line, thinking, then happy, and the class cheers together on a word.
// Cues: `cheerOn` (a word in the line) starts the cheer.
import { Star } from "@remotion/shapes";
import { lookFromSeed } from "@repo/avatar";
import { Portrait } from "@repo/avatar/portrait";
import { radius, shadow } from "@repo/tokens";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useBeat, usePop } from "../beat.tsx";
import { color, fonts, palette } from "../brand.tsx";
import type { Scene } from "../brief.ts";

type Props = Extract<Scene, { kind: "class" }>;

const sparkColors = [
  palette.sunshine[4],
  palette.violet[5],
  palette.sky[4],
  palette.leaf[4],
  palette.berry[4],
];

export function ClassCheer({ nicknames, cheerOn }: Props) {
  const beat = useBeat();
  const { width, height } = useVideoConfig();
  const cheerAt = beat.cue(cheerOn, 0.75);
  // Balanced rows (12 → 6 × 2), as big as the frame allows.
  const rows = Math.max(
    1,
    Math.round(Math.sqrt(nicknames.length / (width / height) / 1.5)),
  );
  const cols = Math.ceil(nicknames.length / rows);
  const unit = Math.min(width, height) / 40;
  const tile = Math.min(
    (width * 0.84) / cols - unit,
    (height * 0.6) / rows / 1.3 - unit,
  );
  // Tiles arrive from the start of the voice to just before the cheer.
  const arriveFrom = Math.max(2, beat.voiceFrom - 6);
  const step = Math.max(
    1.5,
    (cheerAt - 10 - arriveFrom) / Math.max(1, nicknames.length),
  );
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        paddingBottom: height * 0.12,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${tile}px)`,
          justifyContent: "center",
          gap: unit,
        }}
      >
        {nicknames.map((name, i) => (
          <Tile
            key={name}
            name={name}
            // Scattered, not row by row.
            from={arriveFrom + ((i * 7) % nicknames.length) * step}
            cheerAt={cheerAt + (i % 3) * 2}
            size={tile}
            unit={unit}
            spark={sparkColors[i % sparkColors.length] ?? palette.sunshine[4]}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
}

function Tile({
  name,
  from,
  cheerAt,
  size,
  unit,
  spark,
}: {
  name: string;
  from: number;
  cheerAt: number;
  size: number;
  unit: number;
  spark: string;
}) {
  const frame = useCurrentFrame();
  const pop = usePop(from);
  const cheer = usePop(cheerAt);
  const cheering = frame >= cheerAt;
  // A hop on the cheer: up and back, once.
  const hop = cheering
    ? Math.sin(Math.min(1, (frame - cheerAt) / 12) * Math.PI)
    : 0;
  const expression = cheering
    ? "cheering"
    : frame > from + 14
      ? "happy"
      : "thinking";
  return (
    <div
      style={{
        position: "relative",
        background: color.surface.raised,
        borderRadius: radius.lg,
        boxShadow: shadow.lg,
        padding: `${unit * 0.6}px ${unit * 0.4}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: unit * 0.3,
        opacity: frame < from ? 0 : 1,
        transform: `translateY(${(1 - pop) * unit * 4 - hop * unit * 1.2}px) scale(${0.6 + 0.4 * pop})`,
      }}
    >
      <Portrait
        look={lookFromSeed(name)}
        expression={expression}
        size={size * 0.62}
        label=""
      />
      <div
        style={{
          fontFamily: fonts.heading,
          fontWeight: 800,
          fontSize: Math.min(unit * 1.1, size * 0.11),
          color: color.ink.default,
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </div>
      {cheering && (
        <div
          style={{
            position: "absolute",
            top: -unit * 0.8,
            right: -unit * 0.6,
            transform: `scale(${cheer}) rotate(${cheer * 90}deg)`,
          }}
        >
          <Star
            points={4}
            innerRadius={unit * 0.35}
            outerRadius={unit * 0.9}
            fill={spark}
          />
        </div>
      )}
    </div>
  );
}
