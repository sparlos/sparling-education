// The teacher's side: a class progress card whose rows fill in, then a
// misconception insight slides in beside it.
// Cues: "misconceptions" brings in the insight.
import { radius, shadow } from "@repo/tokens";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useBeat, usePop, useRamp } from "../beat.tsx";
import { color, fonts, palette, toneOf } from "../brand.tsx";
import type { Scene, StudentStatus } from "../brief.ts";

type Props = Extract<Scene, { kind: "teacher-view" }>;

const statusColor: Record<StudentStatus, { bg: string; fg: string }> = {
  "got-it": { bg: palette.leaf[1], fg: palette.leaf[8] },
  practising: { bg: palette.sky[1], fg: palette.sky[8] },
  stuck: { bg: palette.sunshine[2], fg: palette.sunshine[9] },
};

export function TeacherView({
  title,
  eyebrow,
  students,
  statusLabels,
  insight,
}: Props) {
  const beat = useBeat();
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const tone = toneOf(beat.tone);
  const enter = usePop(0, false);
  const insightAt = beat.cue("misconceptions", 0.55) - 10;
  const insightIn = usePop(insightAt);
  const unit = Math.min(width, height) / 40;
  const cardW = Math.min(width * 0.46, unit * 34);
  const stuckGlow = (Math.sin(frame / 5) + 1) / 2;
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        paddingBottom: height * 0.1,
        fontFamily: fonts.body,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: unit * 2 }}>
        <div
          style={{
            width: cardW,
            background: color.surface.raised,
            borderRadius: radius.xl,
            boxShadow: shadow.xl,
            padding: unit * 1.6,
            transform: `translateX(${(1 - enter) * -width * 0.5}px) rotate(${(1 - enter) * -6}deg)`,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: unit * 0.75,
              letterSpacing: unit * 0.05,
              textTransform: "uppercase",
              color: tone.text,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontFamily: fonts.heading,
              fontWeight: 900,
              fontSize: unit * 1.6,
              color: color.ink.default,
              margin: `${unit * 0.2}px 0 ${unit}px`,
            }}
          >
            {title}
          </div>
          {students.map((s, i) => (
            <Row
              key={s.name}
              {...s}
              label={statusLabels[s.status]}
              from={beat.voiceFrom + 4 + i * 5}
              unit={unit}
              glow={s.status === "stuck" && frame > insightAt ? stuckGlow : 0}
            />
          ))}
        </div>
        <div
          style={{
            width: cardW * 0.62,
            background: tone.fill,
            color: tone.onFill,
            borderRadius: radius.xl,
            boxShadow: shadow.xl,
            padding: unit * 1.4,
            opacity: frame < insightAt ? 0 : 1,
            transform: `translateY(${(1 - insightIn) * unit * 8}px) scale(${0.7 + 0.3 * insightIn}) rotate(${3 - 3 * insightIn}deg)`,
          }}
        >
          <div
            style={{
              width: unit * 2.4,
              height: unit * 2.4,
              borderRadius: radius.round,
              background: palette.sunshine[4],
              color: palette.ink[9],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: fonts.heading,
              fontWeight: 900,
              fontSize: unit * 1.6,
              marginBottom: unit * 0.8,
            }}
          >
            !
          </div>
          <div
            style={{
              fontFamily: fonts.heading,
              fontWeight: 900,
              fontSize: unit * 1.3,
              lineHeight: 1.15,
            }}
          >
            {insight.title}
          </div>
          <div
            style={{
              marginTop: unit * 0.5,
              fontSize: unit * 0.85,
              lineHeight: 1.4,
              opacity: 0.92,
            }}
          >
            {insight.body}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Row({
  name,
  status,
  progress,
  label,
  from,
  unit,
  glow,
}: {
  name: string;
  status: StudentStatus;
  progress: number;
  label: string;
  from: number;
  unit: number;
  glow: number;
}) {
  const frame = useCurrentFrame();
  const pop = usePop(from, false);
  const fill = useRamp(from + 4, from + 28);
  const chip = statusColor[status];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: unit * 0.8,
        padding: `${unit * 0.45}px 0`,
        borderTop: `2px solid ${color.border.subtle}`,
        opacity: frame < from ? 0 : pop,
        transform: `translateX(${(1 - pop) * unit * 3}px)`,
      }}
    >
      <div
        style={{
          width: unit * 6,
          fontWeight: 700,
          fontSize: unit * 0.95,
          color: color.ink.default,
        }}
      >
        {name}
      </div>
      <div
        style={{
          flex: 1,
          height: unit * 0.6,
          borderRadius: radius.round,
          background: palette.sand[2],
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress * fill * 100}%`,
            height: "100%",
            borderRadius: radius.round,
            background: chip.fg,
          }}
        />
      </div>
      <div
        style={{
          width: unit * 5.4,
          textAlign: "center",
          fontWeight: 800,
          fontSize: unit * 0.75,
          padding: `${unit * 0.2}px 0`,
          borderRadius: radius.round,
          background: chip.bg,
          color: chip.fg,
          boxShadow: glow
            ? `0 0 0 ${unit * 0.25 * glow}px ${palette.sunshine[3]}`
            : undefined,
        }}
      >
        {label}
      </div>
    </div>
  );
}
