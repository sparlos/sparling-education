// The course in side view: water, stones at ticks, the number line, the
// goal once it's found or passed, and the hopper.
import type { AvatarExpression } from "@repo/game-contract";
import { palette } from "@repo/tokens";
import {
  type ComponentType,
  type CSSProperties,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Course as CourseData, Plan, RunEnd } from "../rules/course.ts";
import { Art, arcStroke, trailStroke } from "./art.tsx";
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
/** Its widest, so ticks don't stretch on a very wide screen. */
const maxVW = 1700;
const left = 56;
/** The stones' top, where the hopper stands. */
const groundY = 196;
const waterY = 206;
const lineY = 256;
const hopperSize = 64;

/** How long one hop takes, in ms. */
export const hopMs = 620;
/** How long the hopper takes to sink after a splash, in ms. */
export const sinkMs = 520;

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
  const arcHeight = (length: number) =>
    Math.min(150, 34 + (110 * length) / unit);

  const bubble = result
    ? 22 + 16 * String(Math.max(result.at, unit)).length
    : 0;
  const goalBubble = 22 + 16 * String(course.shown.n).length;
  const flightLength = hopper.flight ? hopper.at - hopper.flight.from : 0;
  const hopperStyle = {
    transform: `translate(${x(hopper.at)}px, ${groundY}px)`,
    transitionDuration: hopper.flight ? `${hopMs}ms` : "0ms",
  } as CSSProperties;
  const arcStyle = {
    "--arc": `${-arcHeight(flightLength)}px`,
    animationDuration: `${hopMs}ms`,
  } as CSSProperties;

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
    >
      <rect width={VW} height={VH} rx={18} fill={palette.sky[0]} />
      <rect y={waterY} width={VW} height={44} fill={palette.sky[3]} />
      {Array.from({ length: Math.ceil(VW / 40) }, (_, i) => (
        <Art
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed tiles
          key={i}
          slot="water"
          x={i * 40}
          y={waterY}
        />
      ))}
      <Art
        slot="start"
        x={x(0) + stoneWidth / 2}
        y={groundY}
        scaleX={(x(0) + stoneWidth / 2) / 60}
      />
      {course.stones
        .filter((s) => s > 0)
        .map((s) => (
          <g key={s} data-stone={s}>
            <Art slot="stone" x={x(s)} y={groundY} scaleX={stoneWidth / 40} />
          </g>
        ))}

      {/* The number line */}
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

      <g
        className={styles.hopper}
        style={hopperStyle}
        data-testid="hopper"
        data-at={hopper.at}
      >
        <g
          key={hopper.flight?.key ?? "still"}
          className={hopper.flight ? styles.flying : undefined}
          style={arcStyle}
        >
          <g className={hopper.sunk ? styles.sunk : styles.standing}>
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
