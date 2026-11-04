// The picture: the night, the wall with its towers and commander, the swarm and
// the greenhouse. It draws what it's given and holds no rules. Bugs are drawn
// as tiled patterns, not one element each, so 1000 bugs cost a Chromebook no more
// than a handful.
import type { AvatarExpression } from "@repo/game-contract";
import { palette } from "@repo/tokens";
import {
  type ComponentType,
  type CSSProperties,
  type RefObject,
  useId,
  useMemo,
  useRef,
} from "react";
import { partTotal, type Wave } from "../rules/parts.ts";
import { numeral, partLabel } from "../rules/teacher.ts";
import { panes, type Volley } from "../rules/volley.ts";
import { Art, type ArtSlot, blockSlots, bugSlots, panePlace } from "./art.tsx";
import {
  type EffectSound,
  Effects,
  paneIsBroken,
  type VolleyPlan,
} from "./Effects.tsx";
import styles from "./game.module.css";
import { nightColours, sunHeight, tilt } from "./night.ts";
import {
  area,
  frontOf,
  labelHeight,
  placeLabels,
  placeSwarm,
  scene,
  standing,
  sunrise,
} from "./swarm.ts";

const partTones = [
  palette.ember[5],
  palette.sky[5],
  palette.sunshine[5],
  palette.berry[5],
];

const wall = { x: 18, y: 90, scale: 0.94 };
const wallRight = wall.x + 56 * wall.scale;
/** The swarm stops here when it reaches the wall. */
const wallFront = wallRight + 8;
/** Labels stay clear of the towers, right of this, when the swarm has marched. */
const towersRight = 110;
export const greenhouseAt = { x: 858, y: 200 };
const groundLine = greenhouseAt.y + 288;
const sunX = 720;
const sunScale = 1.5;
/** Where the sun has risen to at the end, its rays clear of the top. */
const endingSunY = 165;
const commanderFoot = { x: wall.x + 18, y: wall.y - 20 };
const commanderSize = 62;

/** The splash's sky at night, in the field's units. */
const stars = [
  { x: 65, y: 40, s: 1.1 },
  { x: 167, y: 90, s: 0.75 },
  { x: 290, y: 30, s: 0.6 },
  { x: 378, y: 74, s: 0.6 },
  { x: 480, y: 22, s: 0.75 },
  { x: 610, y: 46, s: 0.6 },
  { x: 756, y: 30, s: 0.7 },
  { x: 880, y: 66, s: 0.6 },
  { x: 945, y: 38, s: 1 },
];
const clouds = [
  { x: 200, y: 86, scale: 0.72 },
  { x: 560, y: 56, scale: 0.5 },
];
/** Where the sparkles go when a wave is stopped. */
const sparkles = [
  { x: 180, y: 230 },
  { x: 300, y: 390 },
  { x: 390, y: 260 },
  { x: 480, y: 440 },
  { x: 560, y: 220 },
  { x: 640, y: 350 },
  { x: 740, y: 250 },
  { x: 780, y: 440 },
  { x: 900, y: 170 },
  { x: 950, y: 320 },
];

/** A wave of the swarm, as the screen shows it now. */
export interface FieldWave {
  wave: Wave;
  volley: Volley;
  /** Darts landed so far. */
  spent: number;
  /** What's left has marched to the wall. */
  marched: boolean;
  /** Each part's answer is showing, from the hints. */
  answers: readonly boolean[];
  /** The running counts along a one-part wave's lanes, from the hints. */
  counts: readonly number[];
}

export interface FieldProps {
  /** The swarm, unless the field is empty between waves. */
  shown: FieldWave | null;
  /** The darts in the air. */
  volley: VolleyPlan | null;
  /** What's left of the swarm has reached the wall. */
  wallHit: boolean;
  /** Every bug has just been stopped: sparkles, and the avatar hops. */
  clearing: boolean;
  /** Where the night is: 0 to 1. */
  night: number;
  ending: boolean;
  /** Said at the end, written on the sky since the frame fades its caption. */
  endLine: string;
  Avatar: ComponentType<{ expression: AvatarExpression; size: number }>;
  expression: AvatarExpression;
  label: string;
  sound(id: EffectSound, rate?: number): void;
}

export function Field(props: FieldProps) {
  const { shown, night, ending, Avatar, expression } = props;
  const colours = nightColours(night);
  const skyId = useId();
  const fieldId = useId();
  const sceneRef = useRef<SVGSVGElement>(null);
  const greenhouseRef = useRef<SVGGElement>(null);
  const wallRef = useRef<SVGGElement>(null);
  const wave = shown?.wave;
  const swarm = useMemo(() => (wave ? placeSwarm(wave) : null), [wave]);
  const front = shown && swarm ? frontOf(swarm, shown.volley.left) : null;
  const sunY = ending ? endingSunY : sunrise - sunHeight(night);
  return (
    <svg
      ref={sceneRef}
      className={styles.scene}
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      role="img"
      aria-label={props.label}
      data-testid="field"
      data-night={night.toFixed(3)}
      data-ending={ending || undefined}
    >
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          {colours.sky.map((colour, i) => (
            <stop
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed stops
              key={i}
              className={styles.fade}
              offset={i / 2}
              style={{ stopColor: colour }}
            />
          ))}
        </linearGradient>
        <linearGradient id={fieldId} x1="0" y1="0" x2="0" y2="1">
          {colours.field.map((colour, i) => (
            <stop
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed stops
              key={i}
              className={styles.fade}
              offset={i}
              style={{ stopColor: colour }}
            />
          ))}
        </linearGradient>
      </defs>
      <rect
        width={scene.width}
        height={scene.height}
        fill={`url(#${skyId})`}
        data-testid="sky"
      />
      <g className={styles.fade} style={{ opacity: colours.stars }}>
        {stars.map(({ x, y, s }) => (
          <Art key={`${x}-${y}`} slot="star" x={x} y={y} scale={s} />
        ))}
      </g>
      <g
        className={styles.sun}
        style={{ transform: `translate(${sunX}px, ${sunY}px)` }}
        data-testid="sun"
      >
        {ending && (
          <g className={styles.rays}>
            <Art slot="sun-rays" x={0} y={0} />
          </g>
        )}
        <Art slot="sun" x={0} y={0} scale={sunScale} />
      </g>
      <g className={styles.fade} style={{ opacity: colours.clouds }}>
        {clouds.map(({ x, y, scale }, i) => (
          <g
            key={x}
            className={styles.cloud}
            style={{ animationDelay: `${-i * 9}s` }}
          >
            <Art slot="cloud" x={x} y={y} scale={scale} />
          </g>
        ))}
      </g>
      <g
        className={styles.horizon}
        style={{ transform: `translateY(${ending ? tilt : 0}px)` }}
      >
        <g className={styles.fade} style={{ color: colours.farHills }}>
          <Art slot="hills-far" x={0} y={112} />
        </g>
        <g className={styles.fade} style={{ color: colours.pines }}>
          <Art slot="pines" x={0} y={132} />
        </g>
        <g className={styles.fade} style={{ color: colours.nearHills }}>
          <Art slot="hills-near" x={0} y={160} />
        </g>
        <path
          d={`M0 220 Q500 202 1000 214 V${scene.height + tilt} H0 Z`}
          fill={`url(#${fieldId})`}
          data-testid="ground"
        />
      </g>

      <Shadow x={wall.x + 28 * wall.scale} width={84} />
      <Shadow x={greenhouseAt.x + 62} width={150} />
      <g ref={wallRef}>
        <Art
          slot={props.wallHit ? "wall-hit" : "wall"}
          x={wall.x}
          y={wall.y}
          scale={wall.scale}
        />
      </g>

      {shown && swarm && (
        <g
          key={`${shown.wave.first}-${shown.wave.second}`}
          className={styles.swarm}
          style={{
            transform:
              shown.marched && front !== null
                ? `translateX(${wallFront - front}px)`
                : undefined,
          }}
          data-testid="swarm"
          data-mode={swarm.mode}
          data-first={shown.wave.first}
          data-second={shown.wave.second}
          data-marched={shown.marched || undefined}
          data-hit={props.wallHit || undefined}
        >
          <SwarmParts shown={shown} swarm={swarm} front={front} />
        </g>
      )}

      {/* After the swarm, so the bugs come out from behind it. */}
      <Greenhouse
        broken={shown?.volley.broken ?? 0}
        glowing={ending}
        groupRef={greenhouseRef}
      />

      <Effects
        swarm={swarm}
        wave={wave ?? null}
        spent={shown?.spent ?? 0}
        plan={props.volley}
        wallHit={props.wallHit}
        tones={partTones}
        at={{ greenhouse: greenhouseAt, wallFace: wallRight }}
        refs={{ scene: sceneRef, greenhouse: greenhouseRef, wall: wallRef }}
        sound={props.sound}
      />

      {ending && <Scatter />}
      {props.clearing && (
        <g data-testid="clear-moment">
          {sparkles.map(({ x, y }, i) => (
            <g
              key={x}
              className={styles.sparkle}
              style={{
                transformOrigin: `${x}px ${y}px`,
                animationDelay: `${(i * 37) % 200}ms`,
              }}
            >
              <Art slot="sparkle" x={x} y={y} />
            </g>
          ))}
        </g>
      )}

      <g
        data-testid="commander"
        className={props.clearing ? styles.hop : undefined}
      >
        <Art slot="commander" x={commanderFoot.x} y={commanderFoot.y} />
        {props.volley && (
          <Art
            slot="commander-arm"
            x={commanderFoot.x + 8}
            y={commanderFoot.y - 28}
          />
        )}
        <foreignObject
          x={commanderFoot.x - commanderSize / 2}
          y={commanderFoot.y - commanderSize}
          width={commanderSize}
          height={commanderSize}
        >
          <Avatar expression={expression} size={commanderSize} />
        </foreignObject>
      </g>

      {ending && (
        <text
          className={styles.endLine}
          x={scene.width / 2 - 40}
          y={420}
          textAnchor="middle"
          data-testid="end-line"
        >
          {props.endLine}
        </text>
      )}
    </svg>
  );
}

/** A flat shadow where something stands on the ground. */
function Shadow({ x, width }: { x: number; width: number }) {
  return (
    <ellipse
      cx={x}
      cy={groundLine + 1}
      rx={width / 2}
      ry={6}
      fill={palette.ink[9]}
      opacity={0.16}
    />
  );
}

function SwarmParts({
  shown,
  swarm,
  front,
}: {
  shown: FieldWave;
  swarm: ReturnType<typeof placeSwarm>;
  front: number | null;
}) {
  const baseId = useId();
  const texts = shown.wave.parts.map((part, i) =>
    shown.answers[i]
      ? `${partLabel(part)} = ${numeral(partTotal(part))}`
      : partLabel(part),
  );
  const labels = placeLabels(swarm, texts);
  // Once the swarm has marched, its labels slide along it to stay off the towers.
  const slid = shown.marched && front !== null ? front - wallFront : 0;
  const marchedLabels = placeLabels(swarm, texts, towersRight + slid, slid);
  return (
    <>
      <defs>
        {swarm.parts.map((placed, i) => (
          <pattern
            key={`${placed.x}-${placed.y}`}
            id={`${baseId}-${i}`}
            patternUnits="userSpaceOnUse"
            x={placed.x}
            y={placed.y}
            width={swarm.mode === "bugs" ? swarm.cell : 28}
            height={swarm.mode === "bugs" ? swarm.cell : 28}
          >
            {swarm.mode === "bugs" ? (
              <Art
                slot={bugSlots[i % bugSlots.length] as ArtSlot}
                x={0}
                y={0}
                scale={swarm.cell / 40}
              />
            ) : (
              <Art
                slot={blockSlots[i % blockSlots.length] as ArtSlot}
                x={0}
                y={0}
              />
            )}
          </pattern>
        ))}
      </defs>
      {swarm.parts.map((placed, i) => {
        const left = shown.volley.left[i] ?? 0;
        return (
          <g
            key={`${placed.x}-${placed.y}`}
            data-testid="part"
            data-part={i}
            data-left={left}
          >
            {left === 0 && (
              <rect
                x={placed.x}
                y={placed.y}
                width={placed.width}
                height={placed.height}
                rx={10}
                fill={partTones[i % partTones.length]}
                opacity={0.16}
                data-testid="cleared-patch"
              />
            )}
            <g
              className={styles.marchIn}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <g
                className={styles.bob}
                style={{ animationDelay: `${-i * 170}ms` }}
              >
                {standing(swarm, placed, left).map((r) => (
                  <rect
                    key={`${r.x}-${r.y}`}
                    x={r.x}
                    y={r.y}
                    width={r.width}
                    height={r.height}
                    fill={`url(#${baseId}-${i})`}
                  />
                ))}
              </g>
            </g>
          </g>
        );
      })}
      {swarm.parts.map((placed, i) => {
        const label = labels[i];
        if (!label) return null;
        const left = shown.volley.left[i] ?? 0;
        return (
          <g
            key={`${placed.x}-${placed.y}`}
            data-testid="part-label"
            data-answer={shown.answers[i] || undefined}
            opacity={left === 0 ? 0.8 : 1}
            className={styles.labelIn}
            style={{ color: partTones[i % partTones.length] }}
          >
            <g
              className={styles.labelSlide}
              style={{
                transform: `translateX(${(marchedLabels[i]?.cx ?? label.cx) - label.cx}px)`,
              }}
            >
              <Art
                slot="part-label"
                x={label.cx}
                y={label.cy}
                scaleX={label.width / 100}
                scale={labelHeight / 34}
              />
              <text
                className={styles.labelText}
                x={label.cx}
                y={label.cy + 7}
                textAnchor="middle"
              >
                {texts[i]}
              </text>
            </g>
          </g>
        );
      })}
      <LaneCounts shown={shown} swarm={swarm} />
    </>
  );
}

/** The hint on a one-part wave: the running count on the first two lanes. */
function LaneCounts({
  shown,
  swarm,
}: {
  shown: FieldWave;
  swarm: ReturnType<typeof placeSwarm>;
}) {
  const placed = swarm.parts[0];
  if (!placed || shown.counts.length === 0) return null;
  // On a block there are no lanes to see, so the counts stack at its top.
  const laneH = swarm.mode === "bugs" ? swarm.cell : 44;
  return (
    <>
      {shown.counts.map((count, i) => {
        const text = numeral(count);
        const width = text.length * 13 + 16;
        const y = placed.y + (i + 0.5) * laneH;
        return (
          <g
            key={count}
            data-testid="lane-count"
            style={{ color: palette.ink[9] }}
          >
            <Art
              slot="part-label"
              x={placed.x + width / 2}
              y={y}
              scaleX={width / 100}
              scale={Math.min(1, (laneH - 2) / 34)}
            />
            <text
              className={styles.labelText}
              x={placed.x + width / 2}
              y={y + 7}
              textAnchor="middle"
            >
              {text}
            </text>
          </g>
        );
      })}
    </>
  );
}

function Greenhouse({
  broken,
  glowing,
  groupRef,
}: {
  broken: number;
  glowing: boolean;
  groupRef: RefObject<SVGGElement | null>;
}) {
  return (
    <g
      ref={groupRef}
      transform={`translate(${greenhouseAt.x} ${greenhouseAt.y})`}
      data-testid="greenhouse"
      data-broken={broken}
      data-glowing={glowing || undefined}
    >
      <Art slot="greenhouse" x={0} y={0} />
      {Array.from({ length: panes }, (_, i) => {
        const at = panePlace(i);
        const smashed = paneIsBroken(i, broken);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed panes
          <g key={i} data-testid="pane" data-broken={smashed || undefined}>
            <Art slot={smashed ? "pane-broken" : "pane"} x={at.x} y={at.y} />
          </g>
        );
      })}
      {glowing && (
        <>
          <path
            className={styles.glow}
            d="M1.5 44 L62 5 L122.5 44 V286.5 H1.5 Z"
            fill={palette.sunshine[3]}
          />
          {[
            { x: 18, y: 58 },
            { x: 104, y: 92 },
            { x: 40, y: 150 },
            { x: 92, y: 214 },
            { x: 62, y: 28 },
          ].map(({ x, y }, i) => (
            <g
              key={x}
              className={styles.twinkle}
              style={{
                transformOrigin: `${x}px ${y}px`,
                animationDelay: `${1.5 + i * 0.45}s`,
              }}
            >
              <Art slot="sparkle" x={x} y={y} scale={0.8} />
            </g>
          ))}
        </>
      )}
    </g>
  );
}

/** The last few bugs, and which way each runs off the field at the end. */
const stragglers = Array.from({ length: 16 }, (_, i) => {
  const a = i * 2.4;
  return {
    x: area.x + area.width / 2 + Math.cos(a) * (90 + ((i * 53) % 90)),
    y: 400 + Math.sin(a) * 40,
    run: {
      "--run-x": `${Math.cos(a) * 800}px`,
      "--run-y": `${Math.sin(a) * 300}px`,
    } as CSSProperties,
  };
});

function Scatter() {
  return (
    <g data-testid="scatter">
      {stragglers.map(({ x, y, run }) => (
        <g key={`${x}-${y}`} className={styles.scatter} style={run}>
          <Art slot="bug-straggler" x={x} y={y} scale={0.6} />
        </g>
      ))}
    </g>
  );
}
