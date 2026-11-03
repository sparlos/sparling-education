// The course in side view: water, stones at ticks, the number line, the
// goal once it's found or passed, and the hopper.
import type { AvatarExpression } from "@repo/game-contract";
import { motion, palette } from "@repo/tokens";
import {
  type ComponentType,
  type CSSProperties,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Course as CourseData, Plan, RunEnd } from "../rules/course.ts";
import {
  Art,
  arcStroke,
  Backdrop,
  bankArtWidth,
  stoneArtWidth,
  trailStroke,
  waterTileStep,
} from "./art.tsx";
import { SvgFrac } from "./Frac.tsx";
import styles from "./hop.module.css";

/** Where the hopper is: on a tick, mid-hop, or sunk after a splash. */
export interface Hopper {
  at: number;
  /** The hop it's in the air for, keyed so each hop restarts its arc. */
  flight: { from: number; key: number } | null;
  sunk: boolean;
}

export const home: Hopper = { at: 0, flight: null, sunk: false };

const VH = 340;
/** The drawing's width when its box can't be measured, and its narrowest. */
const minVW = 1000;
/**
 * Its widest, so ticks don't stretch apart on a very wide screen. High
 * enough that a short box (a long plan wrapping) still fills its width.
 */
const maxVW = 2400;
const left = 56;
/** The stones' top, where the hopper stands. */
const groundY = 196;
const waterY = 206;
const lineY = 256;
const hopperSize = 88;

/**
 * The takeoff squash about the hopper's feet, `ms` into a hop: squat, stretch,
 * settle.
 */
function squashAt(ms: number) {
  const p = Math.min(1, ms / motion.duration.slow);
  const [sx, sy] =
    p < 0.6
      ? lerp([1.15, 0.8], [0.92, 1.1], p / 0.6)
      : lerp([0.92, 1.1], [1, 1], (p - 0.6) / 0.4);
  return `scale(${sx} ${sy})`;
}

const lerp = (a: [number, number], b: [number, number], t: number) =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as const;

/** How long one hop takes, in ms. */
export const hopMs = 620;
/** How long the hopper takes to sink after a splash, in ms. */
export const sinkMs = 520;
/** The dock and the character sliding from the middle to the course's start. */
export const slideMs = 350;
/** The stones and the number line fading in, once the dock has arrived. */
export const revealMs = 200;

/**
 * A course coming on screen: first only the water, with the dock and the
 * character in the middle of it, then those two sliding to the start.
 */
export type Arrival = "centre" | "sliding";

const easeInOut = (p: number) =>
  p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;

export interface CourseProps {
  course: CourseData;
  plan: Plan;
  hopper: Hopper;
  /** How the last run ended; shown until the next run. */
  result: RunEnd | null;
  revealed: boolean;
  /** Hint 1: every tick shows its fraction. */
  labels: boolean;
  /** Hint 2: every planned hop shows as an arc. */
  arcs: boolean;
  /** How many of the plan's hops this run has taken off on, for the trail. */
  trail: number;
  Avatar: ComponentType<{ expression: AvatarExpression; size: number }>;
  expression: AvatarExpression;
  label: string;
  /** Set while the course comes on screen, after which everything shows. */
  arrival?: Arrival | null;
}

/**
 * The drawing's width in viewBox units, matched to its box's shape so the
 * course fills the width it's given instead of sitting in side margins.
 */
function useViewWidth() {
  const ref = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(minVW);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const { width: w, height: h } = el.getBoundingClientRect();
      if (w > 0 && h > 0)
        setWidth(Math.round(Math.min(maxVW, Math.max(minVW, (VH * w) / h))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

export function Course(props: CourseProps) {
  const { course, hopper, result } = props;
  const { unit, end } = course;
  const [svgRef, VW] = useViewWidth();
  const right = VW - 24;
  // Half a whole of water past the end catches the longest overshoot.
  const span = end + unit / 2;
  const tick = (right - left) / span;
  const x = (at: number) => left + tick * at;
  const stoneWidth = Math.min(tick - Math.max(3, tick * 0.12), 72);
  const ticks = Array.from({ length: end + 1 }, (_, i) => i);
  // Capped so the hopper's head stays in the drawing at the top of a hop.
  const arcHeight = (length: number) =>
    Math.min(groundY - hopperSize - 8, 34 + (110 * length) / unit);

  const bubble = result
    ? 22 + 16 * String(Math.max(result.at, unit)).length
    : 0;
  const goalBubble = 22 + 16 * String(course.shown.n).length;
  const landing = `translate(${x(hopper.at)} ${groundY})`;

  // A hop is drawn frame by frame, not with CSS transitions: Chrome can paint
  // a foreignObject under an animating SVG transform where it was before the
  // hop began, so the avatar flickered back mid-run. React renders where the
  // hopper lands; while it flies this moves it along the arc and squashes it.
  const hopperRef = useRef<SVGGElement>(null);
  const squashRef = useRef<SVGGElement>(null);
  const flightKey = hopper.flight?.key;
  const flightFrom = hopper.flight?.from ?? hopper.at;
  const x0 = x(flightFrom);
  const x1 = x(hopper.at);
  const arc = arcHeight(hopper.at - flightFrom);
  useLayoutEffect(() => {
    const g = hopperRef.current;
    const squash = squashRef.current;
    if (flightKey === undefined || !g || !squash) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / hopMs);
      const y = groundY - 4 * arc * p * (1 - p);
      g.setAttribute("transform", `translate(${x0 + (x1 - x0) * p} ${y})`);
      squash.setAttribute("transform", squashAt(now - start));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    step(start);
    return () => {
      cancelAnimationFrame(frame);
      g.setAttribute("transform", `translate(${x1} ${groundY})`);
      squash.removeAttribute("transform");
    };
  }, [flightKey, x0, x1, arc]);

  // Frame by frame too, for the same reason as a hop.
  const slide = VW / 2 - x(0);
  const dockRef = useRef<SVGGElement>(null);
  const carriedRef = useRef<SVGGElement>(null);
  const sliding = props.arrival === "sliding";
  useLayoutEffect(() => {
    const parts = [dockRef.current, carriedRef.current];
    if (!sliding || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / slideMs);
      const at = `translate(${slide * (1 - easeInOut(p))} 0)`;
      for (const part of parts) part?.setAttribute("transform", at);
      if (p < 1) frame = requestAnimationFrame(step);
    };
    step(start);
    return () => {
      cancelAnimationFrame(frame);
      for (const part of parts) part?.removeAttribute("transform");
    };
  }, [sliding, slide]);
  const atCentre =
    props.arrival === "centre" ? `translate(${slide} 0)` : undefined;
  const fading = props.arrival ? styles.unrevealed : styles.revealed;

  // The plan's hops chained from 0: hint 2's arcs, and the run's trail.
  const chain: { from: number; to: number; d: number }[] = [];
  let reach = 0;
  for (const d of props.plan) {
    chain.push({ from: reach, to: reach + unit / d, d });
    reach += unit / d;
  }
  const arcs = props.arcs ? chain : [];
  const arcPath = (from: number, to: number) =>
    `M ${x(from)} ${groundY - 4} Q ${(x(from) + x(to)) / 2} ${groundY - 4 - 2 * arcHeight(to - from)} ${x(to)} ${groundY - 4}`;
  // The run's trail: every hop taken off on, the one in the air drawn as it
  // flies; a hop's fraction shows at its arc's top once it's landed.
  const flying = hopper.flight?.key;
  const trail = chain.slice(0, props.trail);
  const landed = flying ?? props.trail;
  const trailId = useId();
  const roundedId = useId();

  return (
    <svg
      ref={svgRef}
      className={styles.course}
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={props.label}
      data-unit={unit}
      data-end={end}
      data-arrival={props.arrival ?? undefined}
      style={{ "--reveal-ms": `${revealMs}ms` } as CSSProperties}
    >
      <rect width={VW} height={VH} rx={18} fill={palette.sky[0]} />
      <clipPath id={roundedId}>
        <rect width={VW} height={VH} rx={18} />
      </clipPath>
      <Backdrop
        width={VW}
        height={waterY + 14}
        clipPath={`url(#${roundedId})`}
      />
      <g ref={dockRef} transform={atCentre} data-testid="dock">
        <Art
          slot="start"
          x={x(0) + stoneWidth / 2}
          y={groundY}
          scaleX={(x(0) + stoneWidth / 2) / bankArtWidth}
        />
      </g>
      <g className={fading} data-testid="stones">
        {course.stones
          .filter((s) => s > 0)
          .map((s) => (
            <g key={s} data-stone={s}>
              <Art
                slot="stone"
                x={x(s)}
                y={groundY}
                scaleX={stoneWidth / stoneArtWidth}
              />
            </g>
          ))}
      </g>
      {Array.from({ length: Math.ceil(VW / waterTileStep) }, (_, i) => (
        <Art
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed tiles
          key={i}
          slot="water"
          x={i * waterTileStep}
          y={waterY}
        />
      ))}

      {/* The number line */}
      <g className={fading} data-testid="number-line">
        <line
          x1={x(0)}
          x2={x(end)}
          y1={lineY}
          y2={lineY}
          stroke={palette.ink[9]}
          strokeWidth={3}
        />
        {ticks.map((t) => {
          const whole = t % unit === 0;
          return (
            <g key={t}>
              <line
                x1={x(t)}
                x2={x(t)}
                y1={lineY - (whole ? 14 : 8)}
                y2={lineY + (whole ? 14 : 8)}
                stroke={palette.ink[9]}
                strokeWidth={whole ? 4 : 2}
              />
              {props.labels && t > 0 && (
                <SvgFrac
                  n={t}
                  d={unit}
                  x={x(t)}
                  y={lineY + 16}
                  size={Math.min(17, tick * 0.62)}
                  fill={palette.ink[8]}
                />
              )}
              {whole && (
                <text
                  x={x(t)}
                  y={VH - 8}
                  textAnchor="middle"
                  fontSize={26}
                  fontWeight={800}
                  fill={palette.ink[9]}
                >
                  {t / unit}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {arcs.map(({ from, to }, i) => (
        <path
          // biome-ignore lint/suspicious/noArrayIndexKey: a plan repeats hops
          key={i}
          data-arc={`${from}-${to}`}
          d={arcPath(from, to)}
          fill="none"
          stroke={arcStroke.stroke}
          strokeWidth={arcStroke.strokeWidth}
          strokeDasharray={arcStroke.dash}
        />
      ))}

      {trail.map(({ from, to, d }, i) => {
        const inFlight = i === flying;
        // Revealed left to right as the hopper's x moves, linearly.
        const clip = `${trailId}-${i}`;
        const top = groundY - 4 - arcHeight(to - from);
        const width = x(to) - x(from);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a plan repeats hops
          <g key={i} data-testid="trail" data-d={d}>
            {inFlight && (
              <clipPath id={clip}>
                <rect
                  className={styles.trailReveal}
                  style={{ animationDuration: `${hopMs}ms` }}
                  x={x(from) - 8}
                  y={0}
                  width={width + 16}
                  height={VH}
                />
              </clipPath>
            )}
            <path
              d={arcPath(from, to)}
              fill="none"
              stroke={trailStroke.stroke}
              strokeWidth={trailStroke.strokeWidth}
              strokeDasharray={trailStroke.dash}
              strokeLinecap="round"
              clipPath={inFlight ? `url(#${clip})` : undefined}
            />
            {i < landed && (
              <g className={styles.trailLabel} data-testid="trail-label">
                {d === 1 ? (
                  <text
                    x={(x(from) + x(to)) / 2}
                    y={top - 8}
                    textAnchor="middle"
                    fontSize={Math.min(22, Math.max(12, width * 0.45))}
                    fontWeight={800}
                    fill={trailStroke.stroke}
                  >
                    1
                  </text>
                ) : (
                  <SvgFrac
                    n={1}
                    d={d}
                    x={(x(from) + x(to)) / 2}
                    // Its stack sits just above the arc's top.
                    y={top - 8 - 2.05 * Math.min(18, Math.max(11, width * 0.4))}
                    size={Math.min(18, Math.max(11, width * 0.4))}
                    fill={trailStroke.stroke}
                  />
                )}
              </g>
            )}
          </g>
        );
      })}

      {props.revealed && (
        <g data-testid="goal">
          <Art slot="goal" x={x(course.goal)} y={groundY} scale={0.9} />
          <rect
            x={x(course.goal) + 6 - goalBubble / 2}
            y={groundY - 168}
            width={goalBubble}
            height={62}
            rx={10}
            fill={palette.sand[0]}
            stroke={palette.ember[6]}
            strokeWidth={3}
          />
          <SvgFrac
            {...course.shown}
            x={x(course.goal) + 6}
            y={groundY - 164}
            size={24}
            fill={palette.ember[8]}
          />
        </g>
      )}

      {result?.kind === "splash" && (
        <g data-testid="splash" className={styles.splash}>
          <Art slot="splash" x={x(result.at)} y={waterY} />
        </g>
      )}

      <g ref={carriedRef} transform={atCentre}>
        <g
          ref={hopperRef}
          transform={landing}
          data-testid="hopper"
          data-at={hopper.at}
        >
          <g ref={squashRef}>
            <g className={hopper.sunk ? styles.sunk : undefined}>
              <foreignObject
                x={-hopperSize / 2}
                y={-hopperSize}
                width={hopperSize}
                height={hopperSize}
              >
                <props.Avatar expression={props.expression} size={hopperSize} />
              </foreignObject>
            </g>
          </g>
        </g>
      </g>

      {(result?.kind === "short" || result?.kind === "past") && (
        <g data-testid="landing">
          <rect
            x={x(result.at) - bubble / 2}
            y={groundY - hopperSize - 72}
            width={bubble}
            height={62}
            rx={10}
            fill={palette.sand[0]}
            stroke={palette.ink[9]}
            strokeWidth={3}
          />
          <SvgFrac
            n={result.at}
            d={unit}
            x={x(result.at)}
            y={groundY - hopperSize - 68}
            size={24}
            fill={palette.ink[9]}
          />
        </g>
      )}
    </svg>
  );
}
