// The close: wordmark, headline, the "free" note and a call-to-action button
// that a cursor presses, in the audience's tone.
// Cues: the note on its first word, the button on the CTA's first word,
// the press just after the voice ends.
import { radius, shadow } from "@repo/tokens";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useBeat, usePop } from "../beat.tsx";
import {
  color,
  fonts,
  palette,
  pressStyle,
  toneOf,
  Wordmark,
} from "../brand.tsx";
import type { Scene } from "../brief.ts";

type Props = Extract<Scene, { kind: "end-card" }>;

export function EndCard({ headline, note, cta, url }: Props) {
  const beat = useBeat();
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const tone = toneOf(beat.tone);
  const unit = Math.min(width, height) / 40;
  const mark = usePop(0);
  const head = usePop(6, false);
  const noteIn = usePop(beat.cue(note.split(/\s+/)[0] ?? "", 0.3) - 4);
  const buttonIn = usePop(beat.cue(cta.split(/\s+/)[0] ?? "", 0.6) - 6);
  const pressAt = beat.voiceFrom + beat.voiceFrames + 4;
  // The cursor glides in, presses, and the button pulses after.
  const cursor = interpolate(frame, [pressAt - 16, pressAt], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pressed = frame >= pressAt && frame < pressAt + 5;
  const pulse =
    frame > pressAt + 5 ? (Math.sin((frame - pressAt) / 6) + 1) / 2 : 0;
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        paddingBottom: height * 0.12,
        gap: unit * 1.2,
      }}
    >
      <div style={{ transform: `scale(${mark})` }}>
        <Wordmark size={unit * 2.6} byline />
      </div>
      <div
        style={{
          maxWidth: width * 0.8,
          textAlign: "center",
          fontFamily: fonts.heading,
          fontWeight: 800,
          fontSize: unit * 3,
          lineHeight: 1.08,
          letterSpacing: -unit * 0.06,
          color: color.ink.default,
          opacity: head,
          transform: `translateY(${(1 - head) * unit * 2}px)`,
        }}
      >
        {headline}
      </div>
      <div
        style={{
          background: tone.soft,
          color: tone.text,
          fontFamily: fonts.body,
          fontWeight: 800,
          fontSize: unit * 1.1,
          padding: `${unit * 0.4}px ${unit * 1.1}px`,
          borderRadius: radius.round,
          transform: `scale(${noteIn})`,
        }}
      >
        {note}
      </div>
      <div style={{ position: "relative", marginTop: unit * 0.6 }}>
        <div
          style={{
            ...pressStyle(tone.edge, pressed ? 0 : 4, unit / 10),
            transform: `scale(${buttonIn * (1 + pulse * 0.03)}) translate(${pressed ? unit * 0.4 : 0}px, ${pressed ? unit * 0.4 : 0}px)`,
            background: tone.fill,
            color: tone.onFill,
            fontFamily: fonts.heading,
            fontWeight: 800,
            fontSize: unit * 1.5,
            padding: `${unit * 0.6}px ${unit * 1.6}px`,
            borderRadius: radius.lg,
            boxShadow: `${pressStyle(tone.edge, pressed ? 0 : 4, unit / 10).boxShadow}, ${shadow.lg}`,
          }}
        >
          {cta}
        </div>
        <svg
          aria-hidden="true"
          width={unit * 2.4}
          height={unit * 2.4}
          viewBox="0 0 32 32"
          style={{
            position: "absolute",
            right: unit * 0.4 - cursor * unit * 10,
            bottom: -unit * 1.4 - cursor * unit * 6,
            opacity: frame < pressAt - 16 ? 0 : 1,
            transform: `scale(${pressed ? 0.85 : 1})`,
          }}
        >
          <path
            d="M6 3 L6 25 L12 19 L16 28 L20 26 L16 17 L24 17 Z"
            fill={"#FFFFFF"}
            stroke={palette.slate[9]}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {url && (
        <div
          style={{
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: unit * 1,
            color: color.ink.muted,
            opacity: buttonIn,
          }}
        >
          {url}
        </div>
      )}
    </AbsoluteFill>
  );
}
