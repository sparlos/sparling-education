// The thing Kindling isn't: a plain quiz card that gets "game costume"
// stickers slapped on it, then a stamp slams across it.
// Cues: the stamp lands on the line's last word.

import { radius, shadow } from "@repo/tokens";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useBeat, usePop } from "../beat.tsx";
import { color, fonts, palette } from "../brand.tsx";
import type { Scene } from "../brief.ts";

type Props = Extract<Scene, { kind: "not-a-quiz" }>;

const stickerSpots = [
  { x: -0.1, y: -0.12, r: -14, c: palette.sunshine[4], t: palette.ink[9] },
  { x: 0.78, y: -0.16, r: 10, c: palette.berry[5], t: palette.sand[0] },
  { x: 0.86, y: 0.7, r: -8, c: palette.sky[5], t: palette.sand[0] },
  { x: -0.14, y: 0.78, r: 12, c: palette.leaf[5], t: palette.sand[0] },
];

export function NotAQuiz({
  header,
  question,
  answers,
  stickers,
  stamp,
}: Props) {
  const beat = useBeat();
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cardIn = usePop(0, false);
  const stampAt = beat.cue(
    beat.words.at(-1)?.text ?? "",
    0.85,
    Math.max(0, beat.words.length - 2),
  );
  const stampPop = usePop(stampAt - 4);
  const w = Math.min(width * 0.5, height * 0.95);
  const unit = w / 20;
  const sinceStamp = frame - stampAt;
  const shake =
    sinceStamp >= 0 && sinceStamp < 10
      ? Math.sin(sinceStamp * 2.8) * (10 - sinceStamp) * 1.4
      : 0;
  const dim = interpolate(sinceStamp, [0, 8], [0, 0.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        paddingBottom: height * 0.1,
      }}
    >
      <div
        style={{
          position: "relative",
          width: w,
          transform: `translate(${shake}px, ${(1 - cardIn) * height * 0.3}px) rotate(${-2 + (1 - cardIn) * 8}deg)`,
          opacity: cardIn,
        }}
      >
        <div
          style={{
            background: color.surface.raised,
            borderRadius: radius.xl,
            boxShadow: shadow.xl,
            padding: unit * 1.4,
            fontFamily: fonts.body,
            filter: `grayscale(${dim * 2})`,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: unit * 0.75,
              color: color.ink.muted,
              textTransform: "uppercase",
              letterSpacing: unit * 0.05,
            }}
          >
            {header}
          </div>
          <div
            style={{
              fontFamily: fonts.heading,
              fontWeight: 800,
              fontSize: unit * 1.5,
              color: color.ink.default,
              margin: `${unit * 0.5}px 0 ${unit}px`,
            }}
          >
            {question}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: unit * 0.6,
            }}
          >
            {answers.map((a, i) => (
              <div
                key={a}
                style={{
                  border: `${unit * 0.12}px solid ${color.border.default}`,
                  borderRadius: radius.lg,
                  padding: `${unit * 0.5}px ${unit * 0.7}px`,
                  fontWeight: 700,
                  fontSize: unit * 1.05,
                  color: color.ink.default,
                }}
              >
                <span
                  style={{ color: color.ink.muted, marginRight: unit * 0.4 }}
                >
                  {"ABCD"[i]}
                </span>
                {a}
              </div>
            ))}
          </div>
        </div>
        {stickers.map((s, i) => (
          <Sticker
            key={s}
            text={s}
            spot={stickerSpots[i % stickerSpots.length] ?? stickerSpots[0]}
            from={
              beat.voiceFrom + Math.round(beat.voiceFrames * (0.25 + i * 0.12))
            }
            w={w}
            unit={unit}
          />
        ))}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            opacity: frame < stampAt - 4 ? 0 : 1,
            transform: `scale(${2.4 - 1.4 * stampPop}) rotate(-12deg)`,
          }}
        >
          <div
            style={{
              fontFamily: fonts.heading,
              fontWeight: 900,
              fontSize: unit * 3,
              color: color.brand.fill,
              border: `${unit * 0.35}px solid ${color.brand.fill}`,
              borderRadius: radius.lg,
              padding: `${unit * 0.2}px ${unit * 0.9}px`,
              background: `${palette.sand[0]}E6`,
              textTransform: "uppercase",
              letterSpacing: unit * 0.08,
              whiteSpace: "nowrap",
            }}
          >
            {stamp}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Sticker({
  text,
  spot = stickerSpots[0],
  from,
  w,
  unit,
}: {
  text: string;
  spot: (typeof stickerSpots)[number] | undefined;
  from: number;
  w: number;
  unit: number;
}) {
  const frame = useCurrentFrame();
  const pop = usePop(from);
  if (!spot) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: spot.x * w,
        top: spot.y * w * 0.8,
        opacity: frame < from ? 0 : 1,
        transform: `scale(${pop}) rotate(${spot.r}deg)`,
        background: spot.c,
        color: spot.t,
        fontFamily: fonts.heading,
        fontWeight: 900,
        fontSize: unit * 1.1,
        padding: `${unit * 0.35}px ${unit * 0.8}px`,
        borderRadius: radius.round,
        boxShadow: shadow.lg,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}
