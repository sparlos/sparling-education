// Fraction Hop, mocked on a Chromebook: hop blocks drop into the plan, play
// is pressed as the voice says "play", and the avatar hops the number line,
// either onto the hidden goal (solve) or into the water (splash).
// Cues: "plan" drops the blocks, "play" presses play; without "play", the
// run is timed so the last hop lands on "splash" (or "goal"). Drawn
// from the game's own art (games/fraction-hop/src/game/art.tsx), not
// captured, so it stays crisp at any size.

import { defaultLook } from "@repo/avatar";
import { Portrait } from "@repo/avatar/portrait";
import { radius, shadow } from "@repo/tokens";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useBeat, usePop, useRamp } from "../beat.tsx";
import { color, fonts, palette, pressStyle } from "../brand.tsx";
import type { Scene } from "../brief.ts";

type Props = Extract<Scene, { kind: "fraction-hop" }>;

const ink = palette.ink[9];
const hopFrames = 13;
const hopGap = 3;

/** Stacked fraction: 3 over 8. */
export function Frac({
  n,
  d,
  size,
  fill = ink,
}: {
  n: number;
  d: number;
  size: number;
  fill?: string;
}) {
  if (d === 1) return <span style={{ fontSize: size * 1.4 }}>{n}</span>;
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        fontSize: size,
        lineHeight: 1,
        fontWeight: 900,
        color: fill,
        verticalAlign: "middle",
      }}
    >
      <span>{n}</span>
      <span
        style={{
          alignSelf: "stretch",
          height: Math.max(3, size / 8),
          background: fill,
          borderRadius: 2,
          margin: `${size * 0.08}px 0`,
        }}
      />
      <span>{d}</span>
    </span>
  );
}

export function FractionHop({
  mode,
  goal,
  plan,
  ticks,
  stones,
  label,
  labels,
}: Props) {
  const beat = useBeat();
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const enter = usePop(0, false);

  // Where each hop lands, in ticks, and how the run ends.
  const goalTicks = (goal[0] / goal[1]) * ticks;
  const stoneSet = new Set(stones ?? []);
  const isStone = (t: number) =>
    stones
      ? stoneSet.has(Math.round(t))
      : Number.isInteger(Math.round(t * 1000) / 1000);
  const landings: number[] = [];
  let at = 0;
  let splashAt = -1;
  for (const [i, d] of plan.entries()) {
    at += ticks / d;
    landings.push(at);
    if (mode === "splash" && splashAt < 0 && !isStone(at)) splashAt = i;
  }
  const hopsShown = splashAt >= 0 ? splashAt + 1 : plan.length;

  // Timing, landed on the voice: play is pressed on "play", or early enough
  // that the last hop lands on "splash" (or the voice's end).
  const runFrames = hopsShown * (hopFrames + hopGap);
  const landWord = beat.find(mode === "splash" ? "splash" : "goal");
  const playAt =
    beat.find("play") ??
    (landWord ?? beat.voiceFrom + beat.voiceFrames) - 8 - runFrames;
  const planFrom =
    beat.find("plan") ?? Math.max(4, playAt - 10 - plan.length * 6);
  const runFrom = playAt + 8;
  const blockStep = Math.max(
    4,
    Math.min(10, Math.floor((playAt - 10 - planFrom) / plan.length)),
  );
  const runEnd = runFrom + runFrames;
  const splashT = landings[splashAt] ?? 0;
  /** Where the splashing hop should have landed: the next stone. */
  const shouldT =
    stones?.filter((t) => t > splashT).sort((a, b) => a - b)[0] ??
    Math.ceil(splashT);
  const wholes = Math.ceil(
    Math.max(goalTicks, landings.at(-1) ?? 0) / ticks + 0.5,
  );
  const totalTicks = wholes * ticks;

  // The device and course geometry.
  const deviceW = Math.min(width * 0.6, height * 1.08);
  const screenW = deviceW * 0.92;
  const screenH = screenW * 0.56;
  const courseW = screenW * 0.9;
  const unit = screenW / 40;
  const x = (t: number) => courseW * 0.04 + (t / totalTicks) * courseW * 0.92;
  const waterY = screenH * 0.48;

  // The avatar: hop i runs from landing i-1 to landing i.
  const runT = frame - runFrom;
  const hop = Math.floor(runT / (hopFrames + hopGap));
  const inHop = runT - hop * (hopFrames + hopGap);
  let ax = x(0);
  let ay = waterY;
  let squash = 1;
  let sunk = 0;
  if (runT >= 0) {
    const i = Math.min(hop, hopsShown - 1);
    const p =
      hop >= hopsShown ? 1 : Math.min(1, Math.max(0, inHop / hopFrames));
    const fromT = i > 0 ? (landings[i - 1] ?? 0) : 0;
    const toT = landings[i] ?? 0;
    ax = x(fromT) + (x(toT) - x(fromT)) * p;
    const arc = Math.min(screenH * 0.28, (x(toT) - x(fromT)) * 0.55);
    ay = waterY - Math.sin(p * Math.PI) * arc;
    squash = p < 0.12 || p > 0.9 ? 0.82 : 1.06;
    if (hop >= hopsShown && splashAt >= 0)
      sunk = Math.min(1, (frame - runEnd) / 10);
  }
  const solved = mode === "solve" && frame >= runEnd;
  const solvePop = usePop(runEnd);
  const splashPop = usePop(runEnd - hopGap);
  const zoom = interpolate(frame, [0, beat.durationInFrames], [1, 1.07]);
  const playPressed = frame >= playAt && frame < playAt + 6;
  const fix = useRamp(runEnd + 10, runEnd + 24);

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
          transform: `translateY(${(1 - enter) * height * 0.5}px) scale(${zoom}) rotate(${(1 - enter) * 4}deg)`,
          position: "relative",
        }}
      >
        <Chip label={label} unit={unit} />
        {/* Chromebook: bezel, screen, base. */}
        <div
          style={{
            width: deviceW,
            padding: (deviceW - screenW) / 2,
            background: palette.ink[8],
            borderRadius: radius.xl,
            boxShadow: shadow.xl,
          }}
        >
          <div
            style={{
              position: "relative",
              width: screenW,
              height: screenH,
              background: palette.sky[0],
              borderRadius: radius.sm,
              overflow: "hidden",
              fontFamily: fonts.heading,
            }}
          >
            {/* Top bar: the goal. */}
            <div
              style={{
                position: "absolute",
                top: unit * 0.8,
                left: unit,
                display: "flex",
                alignItems: "center",
                gap: unit * 0.5,
                background: color.surface.raised,
                borderRadius: radius.round,
                padding: `${unit * 0.35}px ${unit * 0.9}px`,
                boxShadow: shadow.sm,
                fontWeight: 800,
                fontSize: unit * 0.95,
                color: ink,
              }}
            >
              {labels.goalAt} <Frac n={goal[0]} d={goal[1]} size={unit * 0.8} />
            </div>
            {/* The course. */}
            <svg
              aria-hidden="true"
              width={courseW}
              height={screenH * 0.62}
              style={{
                position: "absolute",
                left: (screenW - courseW) / 2,
                top: screenH * 0.06,
                overflow: "visible",
              }}
            >
              <rect
                x={-courseW}
                y={waterY}
                width={courseW * 3}
                height={screenH}
                fill={palette.sky[3]}
              />
              {Array.from({ length: 14 }, (_, i) => (
                <path
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed waves.
                  key={i}
                  d={`M${i * 80 - ((frame * 1.2) % 80) - 40} ${waterY + 18} q20 -10 40 0 t40 0`}
                  fill="none"
                  stroke={palette.sky[1]}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              ))}
              {/* Start bank. */}
              <rect
                x={-courseW}
                y={waterY - 4}
                width={courseW + x(0) + 6}
                height={screenH}
                fill={palette.sand[6]}
              />
              <rect
                x={-courseW}
                y={waterY - 8}
                width={courseW + x(0) + 6}
                height={unit * 0.7}
                rx={6}
                fill={palette.leaf[6]}
              />
              {/* Stones and ticks. */}
              {Array.from({ length: totalTicks }, (_, i) => i + 1).map((t) => {
                const sw = (courseW * 0.92) / totalTicks;
                const stone = isStone(t);
                const whole = t % ticks === 0;
                return (
                  <g key={t}>
                    {stone && (
                      <>
                        <rect
                          x={x(t) - sw * 0.38}
                          y={waterY + 2}
                          width={sw * 0.76}
                          height={unit * 1.6}
                          rx={6}
                          fill={palette.sand[6]}
                        />
                        <rect
                          x={x(t) - sw * 0.38}
                          y={waterY - 4}
                          width={sw * 0.76}
                          height={unit * 0.6}
                          rx={6}
                          fill={palette.leaf[5]}
                        />
                      </>
                    )}
                    <rect
                      x={x(t) - 1.5}
                      y={waterY + unit * 2.1}
                      width={3}
                      height={whole ? unit * 0.9 : unit * 0.5}
                      fill={ink}
                    />
                  </g>
                );
              })}
              {Array.from({ length: wholes + 1 }, (_, w) => (
                <text
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed labels.
                  key={w}
                  x={x(w * ticks)}
                  y={waterY + unit * 4}
                  fontSize={unit * 1.1}
                  fontWeight={900}
                  textAnchor="middle"
                  fill={ink}
                >
                  {w}
                </text>
              ))}
              {/* The run's dotted trail. */}
              {runT > 0 &&
                landings.slice(0, hopsShown).map((toT, i) => {
                  const fromT = i > 0 ? (landings[i - 1] ?? 0) : 0;
                  const arc = Math.min(
                    screenH * 0.28,
                    (x(toT) - x(fromT)) * 0.55,
                  );
                  const mid = (x(fromT) + x(toT)) / 2;
                  const done = hop > i || (hop === i && inHop >= hopFrames);
                  if (!done) return null;
                  return (
                    <path
                      // biome-ignore lint/suspicious/noArrayIndexKey: one per hop.
                      key={i}
                      d={`M${x(fromT)} ${waterY - unit} Q${mid} ${waterY - unit - arc * 2} ${x(toT)} ${waterY - unit}`}
                      fill="none"
                      stroke={palette.sunshine[8]}
                      strokeWidth={5}
                      strokeDasharray="0 12"
                      strokeLinecap="round"
                    />
                  );
                })}
              {/* Goal flag: revealed only when reached. */}
              {solved && (
                <g
                  transform={`translate(${x(goalTicks)} ${waterY - 4}) scale(${solvePop})`}
                >
                  <rect
                    x={-3}
                    y={-unit * 5}
                    width={6}
                    height={unit * 5}
                    rx={3}
                    fill={ink}
                  />
                  <circle
                    cx={unit * 1.1}
                    cy={-unit * 4}
                    r={unit * 1.1}
                    fill={palette.ember[5]}
                    stroke={ink}
                    strokeWidth={4}
                  />
                  <circle
                    cx={unit * 1.1}
                    cy={-unit * 4}
                    r={unit * 0.65}
                    fill={palette.sand[0]}
                  />
                  <circle
                    cx={unit * 1.1}
                    cy={-unit * 4}
                    r={unit * 0.3}
                    fill={palette.ember[5]}
                  />
                </g>
              )}
              {/* Splash, and the stone that hop should have reached. */}
              {splashAt >= 0 && frame >= runEnd - hopGap && (
                <>
                  <g
                    transform={`translate(${x(landings[splashAt] ?? 0)} ${waterY + 10}) scale(${splashPop * 1.6})`}
                    fill={palette.sky[1]}
                    stroke={palette.sky[6]}
                    strokeWidth={3}
                  >
                    <ellipse cx={0} cy={2} rx={34} ry={8} />
                    <path d="M-16 -4 q-8 -22 -16 -30 q14 6 22 26 z" />
                    <path d="M-4 -6 q-2 -26 2 -40 q8 16 4 40 z" />
                    <path d="M10 -4 q8 -22 20 -30 q-6 16 -14 32 z" />
                  </g>
                  {fix > 0 && (
                    <rect
                      x={x(shouldT) - unit * 1.3}
                      y={waterY - unit * 1.2}
                      width={unit * 2.6}
                      height={unit * 3.2}
                      rx={12}
                      fill="none"
                      stroke={palette.berry[5]}
                      strokeWidth={5}
                      strokeDasharray="14 10"
                      opacity={fix}
                    />
                  )}
                </>
              )}
            </svg>
            {/* The avatar. */}
            <div
              style={{
                position: "absolute",
                left: (screenW - courseW) / 2 + ax - unit * 1.5,
                top: screenH * 0.06 + ay - unit * 3 + sunk * unit * 3,
                opacity: 1 - sunk,
                transform: `scale(${1 / squash}, ${squash})`,
                transformOrigin: "50% 100%",
              }}
            >
              <Portrait
                look={{ ...defaultLook, hat: "hat-07" }}
                size={unit * 3}
                label=""
                expression={
                  solved
                    ? "cheering"
                    : sunk > 0
                      ? "encouraging"
                      : runT >= 0
                        ? "happy"
                        : "thinking"
                }
              />
            </div>
            {/* The plan and the play button. */}
            <div
              style={{
                position: "absolute",
                left: unit,
                right: unit,
                bottom: unit * 0.8,
                display: "flex",
                alignItems: "center",
                gap: unit * 0.6,
                background: color.surface.raised,
                borderRadius: radius.lg,
                padding: unit * 0.6,
                boxShadow: shadow.md,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.body,
                  fontWeight: 800,
                  fontSize: unit * 0.7,
                  color: color.ink.muted,
                  whiteSpace: "nowrap",
                  marginRight: unit * 0.4,
                }}
              >
                {labels.plan}
              </div>
              {Array.from({ length: plan.length + 1 }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed slots.
                <Slot key={i} unit={unit}>
                  {i < plan.length && (
                    <Block
                      d={plan[i] ?? 1}
                      from={planFrom + i * blockStep}
                      unit={unit}
                      active={runT >= 0 && hop === i}
                    />
                  )}
                </Slot>
              ))}
              <div style={{ flex: 1 }} />
              <div
                style={{
                  ...pressStyle(
                    palette.leaf[9],
                    playPressed ? 0 : 2,
                    unit / 12,
                  ),
                  transform: playPressed
                    ? `translate(${unit / 3}px, ${unit / 3}px)`
                    : undefined,
                  background: palette.leaf[6],
                  color: palette.sand[0],
                  borderRadius: radius.lg,
                  fontWeight: 900,
                  fontSize: unit * 0.95,
                  padding: `${unit * 0.4}px ${unit * 1}px`,
                  display: "flex",
                  alignItems: "center",
                  gap: unit * 0.3,
                }}
              >
                <svg
                  width={unit * 0.8}
                  height={unit * 0.8}
                  viewBox="0 0 32 32"
                  aria-hidden="true"
                >
                  <path d="M9 5 l19 11 l-19 11 z" fill="currentColor" />
                </svg>
                {labels.play}
              </div>
            </div>
            {/* The result bubble. */}
            {solved && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: unit * 0.8,
                  transform: `translateX(-50%) scale(${solvePop})`,
                  background: palette.leaf[6],
                  color: palette.sand[0],
                  borderRadius: radius.round,
                  padding: `${unit * 0.4}px ${unit * 1.2}px`,
                  fontWeight: 900,
                  fontSize: unit * 1.1,
                  boxShadow: shadow.md,
                  whiteSpace: "nowrap",
                }}
              >
                {labels.result}
              </div>
            )}
            {splashAt >= 0 && frame >= runEnd && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: unit * 0.8,
                  transform: `translateX(-50%) scale(${splashPop})`,
                  background: palette.sky[6],
                  color: palette.sand[0],
                  borderRadius: radius.round,
                  padding: `${unit * 0.4}px ${unit * 1.2}px`,
                  fontWeight: 900,
                  fontSize: unit * 1.1,
                  boxShadow: shadow.md,
                  whiteSpace: "nowrap",
                }}
              >
                {labels.result}
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            width: deviceW * 1.08,
            marginLeft: -deviceW * 0.04,
            height: deviceW * 0.03,
            background: palette.ink[6],
            borderRadius: `0 0 ${radius.xl}px ${radius.xl}px`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}

function Chip({ label, unit }: { label: string; unit: number }) {
  const pop = usePop(10);
  return (
    <div
      style={{
        position: "absolute",
        top: -unit * 1.6,
        right: -unit * 1.2,
        zIndex: 2,
        transform: `scale(${pop}) rotate(4deg)`,
        background: palette.sunshine[4],
        color: ink,
        fontFamily: fonts.heading,
        fontWeight: 900,
        fontSize: unit * 1.2,
        padding: `${unit * 0.4}px ${unit * 1}px`,
        borderRadius: radius.round,
        boxShadow: shadow.lg,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}

function Slot({ unit, children }: { unit: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: unit * 2.6,
        height: unit * 2.6,
        borderRadius: radius.md,
        border: `3px dashed ${color.border.default}`,
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}

function Block({
  d,
  from,
  unit,
  active,
}: {
  d: number;
  from: number;
  unit: number;
  active: boolean;
}) {
  const frame = useCurrentFrame();
  const pop = usePop(from);
  return (
    <div
      style={{
        position: "absolute",
        inset: -3,
        ...pressStyle(palette.sunshine[8], active ? 0 : 1.5, unit / 14),
        background: active ? palette.sunshine[3] : palette.sunshine[1],
        borderRadius: radius.md,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: fonts.heading,
        opacity: frame < from ? 0 : 1,
        transform: `translateY(${(1 - pop) * -unit * 6}px) scale(${0.7 + 0.3 * pop}) rotate(${(1 - pop) * 20}deg)`,
      }}
    >
      <Frac n={1} d={d} size={unit * 0.75} />
    </div>
  );
}
