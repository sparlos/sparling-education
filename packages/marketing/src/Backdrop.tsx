// The paper every scene sits on: the site's lavender, a faint dot grid and
// a few soft tone-tinted blobs drifting on noise, so nothing is ever static.
import { noise2D } from "@remotion/noise";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { color, palette } from "./brand.tsx";

export function Backdrop({
  tint = palette.violet[1],
  accent = palette.sunshine[1],
  dark,
  seed = 1,
}: {
  tint?: string;
  accent?: string;
  /** Ink background instead of the light paper. */
  dark?: boolean;
  seed?: number;
}) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / 140;
  const blobs = [
    { c: tint, x: 0.12, y: 0.2, r: 0.42 },
    { c: accent, x: 0.88, y: 0.8, r: 0.48 },
    { c: tint, x: 0.82, y: 0.12, r: 0.24 },
  ];
  const dot = dark ? palette.slate[8] : palette.slate[2];
  return (
    <AbsoluteFill
      style={{
        background: dark ? color.surface.inverse : color.surface.page,
        overflow: "hidden",
      }}
    >
      {blobs.map((b, i) => {
        const dx = noise2D(`x${seed}${i}`, t, i) * width * 0.05;
        const dy = noise2D(`y${seed}${i}`, i, t) * height * 0.05;
        const r = b.r * Math.max(width, height);
        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed list.
            key={i}
            style={{
              position: "absolute",
              left: b.x * width - r / 2 + dx,
              top: b.y * height - r / 2 + dy,
              width: r,
              height: r,
              borderRadius: "50%",
              background: b.c,
              opacity: dark ? 0.12 : 0.7,
              filter: `blur(${r * 0.18}px)`,
            }}
          />
        );
      })}
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(${dot} 2px, transparent 2.5px)`,
          backgroundSize: "44px 44px",
          backgroundPosition: `${(frame * 0.4) % 44}px ${(frame * 0.25) % 44}px`,
          opacity: 0.6,
        }}
      />
    </AbsoluteFill>
  );
}
