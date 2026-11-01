// The loop from above: the field, the track, the yard with its gate and
// two signs, each station with its sign, and the train (engine, the
// avatar in its cab, and the wagon with its load on the roof). Positions
// come from track.ts, in the 1000 × 600 viewBox.
import type { AvatarExpression } from "@repo/game-contract";
import {
  type ComponentType,
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { written } from "../rules/amounts.ts";
import type { Lap } from "../rules/lap.ts";
import { Art, type ArtSlot, stationSlot } from "./art.tsx";
import styles from "./game.module.css";
import { gateAt, pointAt, trackBox, viewBox, wagonGap } from "./track.ts";

/** Which sign is red, after a miss. */
export type WrongSign = { station: number } | "back" | null;

export interface TrainView {
  /** Where the engine is along the track. */
  at: number;
  /** How long it takes to get there from where it was. */
  ms: number;
  stalled: boolean;
  waving: boolean;
}

export interface LoopProps {
  lap: Lap;
  /** What the student has typed, shown on the missing sign ("" shows ?). */
  typed: string;
  train: TrainView;
  /** The number on the wagon's roof, null for ?, or "hidden" for none. */
  roof: number | null | "hidden";
  gateOpen: boolean;
  /** The trip's sum so far, during a run and after it. */
  tally: string | null;
  moment: StationMoment | null;
  /** The train is waiting at the gate while the yard's sign is checked. */
  checking: boolean;
  wrong: WrongSign;
  Avatar: ComponentType<{ expression: AvatarExpression; size: number }>;
}

/** The train at a station: its crates are crossing, and its amount shows. */
export interface StationMoment {
  station: number;
  amount: number;
}

/** Each sign's middle, in the viewBox: the way out, and the way back in. */
export const yardSigns = {
  leaves: { x: 640, y: 398 },
  back: { x: 360, y: 398 },
} as const;

/** A station's sign, with its building on it, just inside the track. */
export function stationSign(count: number, i: number) {
  if (count === 1) return { x: 500, y: 185 };
  return i === 0 ? { x: 755, y: 297 } : { x: 245, y: 297 };
}

/**
 * The arrow between a station's sign and the track: where it sits, and the
 * way it points for a pickup (a drop-off points the other way).
 */
function stationArrow(count: number, i: number) {
  if (count === 1) return { x: 500, y: 127, angle: -90 };
  return i === 0
    ? { x: 857, y: 297, angle: 0 }
    : { x: 143, y: 297, angle: 180 };
}

/** The trip's sum, in the field: clear of the signs, and of the trip picture. */
const tallyAt = (count: number) => ({ x: 500, y: count === 1 ? 249 : 165 });

const hopDelays = [0, 110, 220, 330, 440];

/** What's typed, as a sign shows it: 20 997, or ? before anything's typed. */
export function typedText(typed: string): string {
  if (!typed) return "?";
  const [whole = "", decimals] = typed.split(".");
  const grouped =
    whole.length > 4 ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : whole;
  return decimals === undefined ? grouped : `${grouped}.${decimals}`;
}

/** Glides a distance along the track to its target over `ms`, a frame at a time. */
function useGlide(target: number, ms: number): number {
  const [at, setAt] = useState(target);
  const now = useRef(target);
  useEffect(() => {
    const from = now.current;
    if (ms <= 0 || typeof requestAnimationFrame === "undefined") {
      now.current = target;
      setAt(target);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / ms);
      // Eases in leaving a stop and out arriving at the next.
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      now.current = from + (target - from) * eased;
      setAt(now.current);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return at;
}

function Sign(props: {
  slot: ArtSlot;
  x: number;
  y: number;
  text: string;
  missing: boolean;
  wrong: boolean;
  testId: string;
  loads?: boolean;
  hand: string;
  /** Goes before the number: + for a pickup, − for a drop-off. */
  prefix?: string;
  /** Drawn on the sign's left: the station's building. */
  building?: ArtSlot;
  checking?: boolean;
}) {
  const { x, y } = props;
  const shown = `${props.prefix ?? ""}${props.text}`;
  return (
    <g
      data-testid={props.testId}
      data-missing={props.missing || undefined}
      data-wrong={props.wrong || undefined}
      data-hand={props.hand}
      data-text={props.text}
      data-loads={props.loads}
    >
      <Art slot={props.slot} x={x} y={y} />
      {props.building && (
        <Art slot={props.building} x={x - 48} y={y} scale={0.55} />
      )}
      {props.checking && (
        <rect
          x={x - 90}
          y={y - 47}
          width={180}
          height={94}
          rx={20}
          className={styles.checkRing}
          data-testid="check-ring"
        />
      )}
      {props.missing && (
        <g className={styles.missingGlow}>
          <Art slot="sign-missing" x={x} y={y} />
        </g>
      )}
      {props.wrong && <Art slot="sign-wrong" x={x} y={y} />}
      <text
        x={x + 34}
        y={y + 2}
        className={styles.signText}
        textAnchor="middle"
        dominantBaseline="central"
        textLength={shown.length > 4 ? 88 : undefined}
        lengthAdjust="spacingAndGlyphs"
      >
        {shown}
      </text>
    </g>
  );
}

export function Loop(props: LoopProps) {
  const { lap, train } = props;
  const count = lap.stations.length;
  const at = useGlide(train.at, train.ms);
  const engine = pointAt(at);
  const wagon = pointAt(at - wagonGap);
  const cab = pointAt(at - 18);
  const gate = pointAt(gateAt);
  const shown = (n: number, isMissing: boolean) =>
    isMissing ? typedText(props.typed) : written(n, lap.dp);
  // The roof's number floats just above the wagon, wherever it is on the loop.
  const badge = { x: wagon.x, y: wagon.y - 40 };
  const roofText =
    typeof props.roof === "number" ? written(props.roof, lap.dp) : "?";
  const { missing } = lap;
  const tally = tallyAt(count);
  const momentAt = props.moment && lap.stations[props.moment.station];
  const momentSign = props.moment && stationSign(count, props.moment.station);
  const driverRef = useRef<SVGGElement>(null);
  // Restart the wave each time it's asked for.
  useLayoutEffect(() => {
    const el = driverRef.current;
    if (!el || !train.waving) return;
    el.classList.remove(styles.waving as string);
    void el.getBoundingClientRect();
    el.classList.add(styles.waving as string);
  }, [train.waving]);

  return (
    <svg
      className={styles.loopSvg}
      viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
      data-testid="loop"
      data-dp={lap.dp}
      aria-hidden="true"
    >
      <Art slot="field" x={0} y={0} />
      <Art slot="yard" x={500} y={trackBox.bottom + 14} />
      <Art slot="track" x={0} y={0} />
      {lap.stations.map((s, i) => {
        const a = stationArrow(count, i);
        return (
          <g
            key={s.place}
            data-testid="station"
            data-place={s.place}
            transform={`translate(${a.x} ${a.y}) rotate(${a.angle + (s.loads ? 0 : 180)})`}
          >
            <Art slot={s.loads ? "arrow-load" : "arrow-unload"} x={0} y={0} />
          </g>
        );
      })}
      <g
        className={styles.gate}
        data-testid="gate"
        data-open={props.gateOpen || undefined}
        style={{ transformOrigin: `${gate.x}px ${gate.y - 40}px` }}
      >
        <Art slot="gate" x={gate.x} y={gate.y} />
      </g>
      <Sign
        slot="sign-leaves"
        {...yardSigns.leaves}
        text={shown(lap.start, missing.what === "start")}
        missing={missing.what === "start"}
        wrong={false}
        testId="sign-leaves"
        hand="sign-leaves"
      />
      <Sign
        slot="sign-back"
        {...yardSigns.back}
        text={shown(lap.end, missing.what === "end")}
        missing={missing.what === "end"}
        wrong={props.wrong === "back"}
        testId="sign-back"
        hand="sign-back"
        checking={props.checking}
      />
      {lap.stations.map((s, i) => {
        const p = stationSign(count, i);
        const isMissing = missing.what === "change" && missing.at === i;
        return (
          <Sign
            key={s.place}
            slot={s.loads ? "sign-load" : "sign-unload"}
            {...p}
            text={shown(s.amount, isMissing)}
            missing={isMissing}
            wrong={
              typeof props.wrong === "object" && props.wrong?.station === i
            }
            testId="sign-station"
            loads={s.loads}
            hand={`sign-station-${i}`}
            prefix={s.loads ? "+" : "−"}
            building={stationSlot(s.place)}
          />
        );
      })}
      {props.tally !== null && (
        <g data-testid="tally" data-text={props.tally}>
          <rect
            x={tally.x - Math.min(270, props.tally.length * 8 + 28)}
            y={tally.y - 19}
            width={2 * Math.min(270, props.tally.length * 8 + 28)}
            height={38}
            rx={12}
            className={styles.tallyPlate}
          />
          <text
            x={tally.x}
            y={tally.y + 1}
            className={styles.tallyText}
            textAnchor="middle"
            dominantBaseline="central"
            textLength={props.tally.length > 30 ? 510 : undefined}
            lengthAdjust="spacingAndGlyphs"
          >
            {props.tally}
          </text>
        </g>
      )}
      <g
        className={train.stalled ? styles.stalled : undefined}
        data-testid="train"
        data-at={Math.round(train.at)}
        data-stalled={train.stalled || undefined}
      >
        <g
          transform={`translate(${wagon.x} ${wagon.y}) rotate(${wagon.angle})`}
        >
          <Art slot="wagon" x={0} y={0} />
        </g>
        <g
          transform={`translate(${engine.x} ${engine.y}) rotate(${engine.angle})`}
        >
          <Art slot="engine" x={0} y={0} />
        </g>
        <g ref={driverRef} transform={`translate(${cab.x} ${cab.y})`}>
          <g className={styles.driver}>
            <Art slot="driver" x={0} y={0} />
            <foreignObject x={-16} y={-16} width={32} height={32}>
              <props.Avatar expression="happy" size={32} />
            </foreignObject>
          </g>
        </g>
        <g
          transform={`translate(${badge.x} ${badge.y})`}
          data-testid="roof"
          data-load={typeof props.roof === "number" ? props.roof : "?"}
        >
          {props.roof !== "hidden" && (
            <>
              <rect
                x={-46}
                y={-20}
                width={92}
                height={40}
                rx={12}
                className={styles.roofBadge}
              />
              <text
                className={styles.roofText}
                textAnchor="middle"
                dominantBaseline="central"
                textLength={roofText.length > 5 ? 84 : undefined}
                lengthAdjust="spacingAndGlyphs"
              >
                {roofText}
              </text>
            </>
          )}
        </g>
      </g>
      {props.moment && momentAt && momentSign && (
        <g data-testid="station-moment" data-station={props.moment.station}>
          {hopDelays.map((delay) => {
            const from = momentAt.loads ? momentSign : wagon;
            const to = momentAt.loads ? wagon : momentSign;
            return (
              <g key={delay} transform={`translate(${from.x} ${from.y})`}>
                <g
                  className={styles.hop}
                  style={
                    {
                      "--dx": `${to.x - from.x}px`,
                      "--dy": `${to.y - from.y}px`,
                      animationDelay: `${delay}ms`,
                    } as CSSProperties
                  }
                >
                  <Art slot="crate-0" x={0} y={0} scale={1.6} />
                </g>
              </g>
            );
          })}
          <rect
            x={momentSign.x - 85}
            y={momentSign.y - 42}
            width={170}
            height={84}
            rx={14}
            className={styles.amountPlate}
          />
          <text
            x={momentSign.x}
            y={momentSign.y}
            className={styles.amountPop}
            data-loads={momentAt.loads}
            data-testid="station-amount"
            textAnchor="middle"
            dominantBaseline="central"
            textLength={
              written(props.moment.amount, lap.dp).length > 4 ? 150 : undefined
            }
            lengthAdjust="spacingAndGlyphs"
          >
            {`${momentAt.loads ? "+" : "−"}${written(props.moment.amount, lap.dp)}`}
          </text>
        </g>
      )}
    </svg>
  );
}
