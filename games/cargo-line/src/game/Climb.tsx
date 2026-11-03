// The picture: the whole mountain, with one stretch of track drawn small on
// its face, and a camera that moves between them. A stretch has its scenery,
// its signs, its gate and the train (engine, the avatar in its cab, and the
// wagon with its load's number above). Positions come from track.ts.
import type { AvatarExpression } from "@repo/game-contract";
import {
  type ComponentType,
  type CSSProperties,
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { written } from "../rules/amounts.ts";
import { type Lap, partOf } from "../rules/lap.ts";
import {
  Art,
  type ArtSlot,
  cab,
  sceneSlot,
  signBoard,
  stationSlot,
} from "./art.tsx";
import styles from "./game.module.css";
import {
  gateAt,
  gateSign,
  gates,
  pointAt,
  routeAngleAt,
  startSign,
  stopSign,
  stretchClose,
  stretchFar,
  summit,
  trackY,
  viewBox,
  wagonGap,
  wholeMountain,
  zoomOn,
} from "./track.ts";

/** Which sign is red, after a miss. */
export type WrongSign = { station: number } | "gate" | null;

export interface TrainView {
  /** Where the engine is along the track. */
  at: number;
  /** How long it takes to get there from where it was. */
  ms: number;
  stalled: boolean;
  waving: boolean;
}

/** The train at a station: its crates are crossing, and its amount shows. */
export interface StationMoment {
  station: number;
  amount: number;
}

export interface ClimbProps {
  /** Which trip's stretch is set up: 1 to 6, or 0 for the tutorial's practice track. */
  index: number;
  lap: Lap;
  /** What the student has typed, shown on the missing sign ("" shows ?). */
  typed: string;
  train: TrainView;
  /** The number above the wagon, null for ?, or "hidden" for none. */
  roof: number | null | "hidden";
  gateOpen: boolean;
  /** The trip's sum so far, during a run and after it. */
  tally: string | null;
  moment: StationMoment | null;
  /** The train is waiting at the gate while its sign is checked. */
  checking: boolean;
  wrong: WrongSign;
  Avatar: ComponentType<{ expression: AvatarExpression; size: number }>;
  /** Close on the stretch, or back on the whole mountain. */
  near: boolean;
  /** The camera jumps instead of moving: the student skipped the tutorial. */
  jump: boolean;
  tiny: { x: number; y: number };
  /** Gates opened so far. */
  cleared: number;
  atTop: boolean;
}

/** The trip's sum, on the hillside below the track, clear of the signs. */
const tallyAt = { x: 620, y: 555 };

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
  /** Drawn on the sign's left: the stop's building. */
  building?: ArtSlot;
  checking?: boolean;
}) {
  const { x, y } = props;
  const shown = `${props.prefix ?? ""}${props.text}`;
  const double = props.slot === "sign-leaves" || props.slot === "sign-arrives";
  const board = double ? signBoard.double : signBoard.single;
  return (
    <g
      data-testid={props.testId}
      data-missing={props.missing || undefined}
      data-wrong={props.wrong || undefined}
      data-hand={props.hand}
      data-text={props.text}
      data-loads={props.loads}
    >
      <Art slot="sign-post" x={x} y={trackY(x)} />
      <Art
        slot={
          !props.wrong
            ? props.slot
            : double
              ? "sign-arrives-wrong"
              : "sign-stop-wrong"
        }
        x={x}
        y={y}
      />
      {props.building && (
        <Art slot={props.building} x={x - 62} y={y} scale={0.38} />
      )}
      {props.checking && (
        <rect
          x={x - signBoard.width / 2 - 4}
          y={y - board / 2 - 4}
          width={signBoard.width + 8}
          height={board + 8}
          rx={20}
          className={styles.checkRing}
          data-testid="check-ring"
        />
      )}
      {props.missing && (
        <g className={styles.missingGlow}>
          <Art
            slot="sign-missing"
            x={x}
            y={y}
            scaleX={1}
            scale={(board + 12) / 117}
          />
        </g>
      )}
      <text
        x={x + (double ? 24 : 27)}
        y={y + 2}
        className={styles.signText}
        textAnchor="middle"
        dominantBaseline="central"
        textLength={shown.length > 4 ? 112 : undefined}
        lengthAdjust="spacingAndGlyphs"
      >
        {shown}
      </text>
    </g>
  );
}

/** The whole mountain, with the tiny train on its way up. */
function Mountain(props: Pick<ClimbProps, "tiny" | "cleared" | "atTop">) {
  return (
    <g data-testid="mountain" data-cleared={props.cleared}>
      <Art slot="mountain" x={0} y={0} />
      <Art slot="mountain-route" x={0} y={0} />
      {gates.map((g, i) => (
        <Art
          key={g.x}
          slot={
            i < props.cleared
              ? "mountain-gate-open"
              : i === props.cleared
                ? "mountain-gate-next"
                : "mountain-gate"
          }
          x={g.x}
          y={g.y}
        />
      ))}
      <g data-testid="summit-flag" data-reached={props.atTop || undefined}>
        <Art
          slot={props.atTop ? "summit-flag-up" : "summit-flag"}
          x={summit.x}
          y={summit.y}
        />
      </g>
      <g
        className={styles.tiny}
        data-testid="tiny-train"
        style={{ transform: `translate(${props.tiny.x}px, ${props.tiny.y}px)` }}
      >
        <g transform={`rotate(${routeAngleAt(props.tiny)})`}>
          <Art slot="mountain-train" x={0} y={0} />
        </g>
      </g>
    </g>
  );
}

function Stretch(props: ClimbProps) {
  const { lap, train } = props;
  const count = lap.stations.length;
  const at = useGlide(train.at, train.ms);
  const engine = pointAt(at);
  const wagon = pointAt(at - wagonGap);
  const gate = pointAt(gateAt);
  const shown = (n: number, isMissing: boolean) =>
    isMissing ? typedText(props.typed) : written(n, lap.dp);
  // The number floats just above the wagon, upright on the slope.
  const badge = { x: wagon.x, y: wagon.y - 88 };
  const roofText =
    typeof props.roof === "number" ? written(props.roof, lap.dp) : "?";
  const { missing } = lap;
  const momentAt = props.moment && lap.stations[props.moment.station];
  const momentSign = props.moment && stopSign(count, props.moment.station);
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
    <>
      <g
        className={styles.gate}
        data-testid="gate"
        data-open={props.gateOpen || undefined}
        style={{ transformOrigin: `${gate.x}px ${gate.y - 96}px` }}
      >
        <Art slot="gate" x={gate.x} y={gate.y} />
      </g>
      <Sign
        slot="sign-leaves"
        {...startSign}
        text={shown(lap.start, missing.what === "start")}
        missing={missing.what === "start"}
        wrong={false}
        testId="sign-leaves"
        hand="sign-leaves"
      />
      <Sign
        slot="sign-arrives"
        {...gateSign}
        text={shown(lap.end, missing.what === "end")}
        missing={missing.what === "end"}
        wrong={props.wrong === "gate"}
        testId="sign-arrives"
        hand="sign-arrives"
        checking={props.checking}
      />
      {lap.stations.map((s, i) => {
        const p = stopSign(count, i);
        const isMissing = missing.what === "change" && missing.at === i;
        return (
          <g key={s.place}>
            <Sign
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
            {/* The way the crates go: down onto the train, or up off it. */}
            <g data-testid="station" data-place={s.place}>
              <Art
                slot={s.loads ? "arrow-load" : "arrow-unload"}
                x={p.x}
                y={p.y + 60}
              />
            </g>
          </g>
        );
      })}
      {props.tally !== null && (
        <g data-testid="tally" data-text={props.tally}>
          <rect
            x={tallyAt.x - Math.min(270, props.tally.length * 8 + 28)}
            y={tallyAt.y - 19}
            width={2 * Math.min(270, props.tally.length * 8 + 28)}
            height={38}
            rx={12}
            className={styles.tallyPlate}
          />
          <text
            x={tallyAt.x}
            y={tallyAt.y + 1}
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
        data-ms={train.ms}
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
          <g ref={driverRef} transform={`translate(${cab.x} ${cab.y})`}>
            <g className={styles.driver}>
              <Art slot="driver" x={0} y={0} />
              <foreignObject x={-16} y={-16} width={32} height={32}>
                <props.Avatar expression="happy" size={32} />
              </foreignObject>
            </g>
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
            const top = { x: wagon.x, y: wagon.y - 50 };
            const from = momentAt.loads ? momentSign : top;
            const to = momentAt.loads ? top : momentSign;
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
            x={momentSign.x - signBoard.width / 2}
            y={momentSign.y - signBoard.single / 2}
            width={signBoard.width}
            height={signBoard.single}
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
    </>
  );
}

/** The scenery and track: they never change during a stretch, so they're never redrawn. */
const StretchBackdrop = memo(function StretchBackdrop({
  part,
}: {
  part: number;
}) {
  return (
    <svg
      className={styles.stretchBackdrop}
      viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
      aria-hidden="true"
    >
      <Art slot={sceneSlot(part)} x={0} y={0} />
      <Art slot="track" x={0} y={0} />
    </svg>
  );
});

// The mountain and the stretch are separate layers, moved in step, so the
// browser paints each once at its full size and only slides them: the stretch
// is sharp as soon as it arrives, and the move doesn't repaint their detail.
export function Climb(props: ClimbProps) {
  const { lap, index, near, jump } = props;
  return (
    <div
      className={styles.scene}
      data-testid="scene"
      data-camera={near ? index : "mountain"}
      data-jump={jump || undefined}
      data-dp={lap.dp}
      aria-hidden="true"
    >
      <svg
        className={styles.camera}
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        style={{ transform: near ? zoomOn(index) : wholeMountain }}
        aria-hidden="true"
      >
        <Mountain
          tiny={props.tiny}
          cleared={props.cleared}
          atTop={props.atTop}
        />
      </svg>
      <div
        className={styles.stretch}
        data-near={near || undefined}
        style={{ transform: near ? stretchClose(index) : stretchFar(index) }}
      >
        <StretchBackdrop part={partOf(index)} />
        <svg
          className={styles.stretchFront}
          viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
          aria-hidden="true"
        >
          <Stretch {...props} />
        </svg>
      </div>
    </div>
  );
}
