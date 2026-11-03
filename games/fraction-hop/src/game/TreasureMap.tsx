// The journey (SPEC.md's Journey section): one trip across a treasure map, a
// spot per task. It lies over the whole game frame, and has no rules in it: it
// shows where the camera is, where the character stands and which spots are
// done, and the game says when each of those changes.
import type { AvatarExpression } from "@repo/game-contract";
import { SlotArt, SlotImage } from "@repo/game-kit/art";
import { palette } from "@repo/tokens";
import {
  type ComponentType,
  type CSSProperties,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { mapArt, pathStroke } from "./art.tsx";
import styles from "./treasure.module.css";

/** The camera's move, in or out. */
export const zoomMs = 800;
/** The map's fade over the course, ending as the zoom in ends. */
export const mapFadeMs = 350;
/** The beat before the character sets off, with its spot newly gold. */
export const settleMs = 150;
/** The character hopping from one spot to the next. */
export const walkMs = 1000;
/** The last stretch, to the chest. */
export const walkToChestMs = 1200;
/** A beat for the camera to find the character on the course, unseen. */
export const aimMs = 30;
/** With reduced motion, how long the character holds on its new spot. */
export const stillHoldMs = 1100;
/** The shut chest, filling the screen, before it opens. */
export const chestShutMs = 450;
/** The open chest, at least: longer if its line takes longer to say. */
export const chestOpenMs = 3000;
/** The whole moment between two tasks. */
export const momentMs = aimMs + zoomMs + settleMs + walkMs + aimMs + zoomMs;
/** The whole ending, from the last task's "You found the goal!" and its pause. */
export const endingMs =
  aimMs + zoomMs + settleMs + walkToChestMs + chestShutMs + chestOpenMs;

const mapW = mapArt.map.width;
const mapH = mapArt.map.height;

/** The six spots, in the map's frame: a task's, in order. */
export const spots = [
  { x: 130, y: 395 },
  { x: 365, y: 430 },
  { x: 575, y: 285 },
  { x: 320, y: 150 },
  { x: 690, y: 105 },
  { x: 935, y: 270 },
] as const;
const chestSpot = { x: 1150, y: 130 };
/** The path out of each spot, the last one to the chest. */
const legs = [
  "M130 395 C 190 465, 290 480, 365 430",
  "M365 430 C 470 400, 590 390, 575 285",
  "M575 285 C 550 200, 410 240, 320 150",
  "M320 150 C 390 50, 560 40, 690 105",
  "M690 105 C 800 120, 890 180, 935 270",
  "M935 270 C 990 350, 1130 270, 1150 130",
] as const;

/** The character on the whole map, in px. */
const walkerPx = 48;
/** Its size at the map's scale once zoomed in, so it lands as the course's. */
const landingPx = 30;
/** Its middle, above the spot its feet stand on, in px. */
const walkerRise = 20;
const hopsPerWalk = 4;
/** How high it hops along the path, in px. */
const hopLift = 16;
const rays = 12;
const coins = 14;

export interface MapCamera {
  /** The whole map, or close on the character. */
  view: "wide" | "close";
  /** Glides there; otherwise it's there at once. */
  moving: boolean;
}

export type ChestState = "none" | "shut" | "open";

export interface TreasureMapProps {
  shown: boolean;
  camera: MapCamera;
  /** Where the character stands: a task's spot, or at the chest past the last. */
  spot: number;
  /** How many spots are finished. */
  done: number;
  chest: ChestState;
  /** The line over the map or the chest, when the board's caption is covered. */
  line: string;
  Avatar: ComponentType<{ expression: AvatarExpression; size: number }>;
}

const placeOf = (spot: number) => spots[spot] ?? chestSpot;
const left = (x: number) => `${(x / mapW) * 100}%`;
const top = (y: number) => `${(y / mapH) * 100}%`;

/** The whole map fits the layer, keeping its shape, with open sea around it. */
function fitMap(size: { w: number; h: number }) {
  const k = Math.min(size.w / mapW, size.h / mapH);
  return {
    k,
    w: mapW * k,
    h: mapH * k,
    x: (size.w - mapW * k) / 2,
    y: (size.h - mapH * k) / 2,
  };
}

const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export function TreasureMap(props: TreasureMapProps) {
  const { shown, camera, spot, done, chest, line, Avatar } = props;
  const layer = useRef<HTMLDivElement>(null);
  const walker = useRef<HTMLDivElement>(null);
  const legPaths = useRef<(SVGPathElement | null)[]>([]);
  const lastSpot = useRef(spot);
  // A stand-in until measured (always, in jsdom).
  const [size, setSize] = useState({ w: mapW, h: mapH });
  const [aim, setAim] = useState({ x: 0, y: 0, s: 1 });
  const map = fitMap(size);

  useLayoutEffect(() => {
    const el = layer.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) setSize({ w: r.width, h: r.height });
    };
    update();
    const watch = new ResizeObserver(update);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  // Close up, the character lands exactly on the course's, in place and size.
  // biome-ignore lint/correctness/useExhaustiveDependencies: each new camera is a new aim
  useLayoutEffect(() => {
    const el = layer.current;
    const on = el?.parentElement?.querySelector(
      '[data-testid="hopper"] foreignObject',
    );
    const r = on?.getBoundingClientRect();
    if (camera.view === "wide" || !el || !r?.height) {
      setAim({ x: 0, y: 0, s: 1 });
      return;
    }
    const box = el.getBoundingClientRect();
    const place = placeOf(spot);
    const s = r.height / landingPx;
    setAim({
      s,
      x: r.left - box.left + r.width / 2 - (map.x + place.x * map.k) * s,
      y:
        r.top -
        box.top +
        r.height / 2 -
        (map.y + place.y * map.k - walkerRise) * s,
    });
  }, [camera, size]);

  // The character hops along the path to its new spot, frame by frame.
  useLayoutEffect(() => {
    const from = lastSpot.current;
    lastSpot.current = spot;
    const el = walker.current;
    const path = legPaths.current[from];
    if (
      spot !== from + 1 ||
      !el ||
      typeof path?.getTotalLength !== "function" ||
      reducedMotion()
    )
      return;
    const ms = spot < spots.length ? walkMs : walkToChestMs;
    const length = path.getTotalLength();
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const point = path.getPointAtLength(length * p);
      el.style.left = left(point.x);
      el.style.top = top(point.y);
      el.style.transform = `translateY(${-Math.abs(Math.sin(Math.PI * hopsPerWalk * p)) * hopLift}px)`;
      if (p < 1) frame = requestAnimationFrame(step);
    };
    step(start);
    return () => {
      cancelAnimationFrame(frame);
      const place = placeOf(spot);
      el.style.left = left(place.x);
      el.style.top = top(place.y);
      el.style.transform = "";
    };
  }, [spot]);

  const place = placeOf(spot);
  const open = chest === "open";

  return (
    <div
      ref={layer}
      className={styles.layer}
      data-testid="treasure-map"
      data-shown={shown || undefined}
      data-view={camera.view}
      data-moving={camera.moving || undefined}
      data-spot={spot}
      data-done={done}
      data-chest={chest}
      style={
        {
          "--zoom-ms": `${zoomMs}ms`,
          "--fade-ms": `${mapFadeMs}ms`,
          "--walker-close": landingPx / walkerPx,
          // What darkens behind the chest and its line: ink at about five sixths.
          "--scrim": `${palette.ink[9]}d8`,
        } as CSSProperties
      }
    >
      <div className={styles.map} style={{ background: palette.sky[3] }}>
        <div
          className={styles.camera}
          style={{
            transform: `translate(${aim.x}px, ${aim.y}px) scale(${aim.s})`,
          }}
        >
          <div
            className={styles.world}
            style={{ left: map.x, top: map.y, width: map.w, height: map.h }}
          >
            <svg
              viewBox={`0 0 ${mapW} ${mapH}`}
              className={styles.mapArt}
              aria-hidden="true"
            >
              <SlotArt id="map" slot={mapArt.map} x={0} y={0} />
              {legs.map((d, i) => (
                <path
                  key={d}
                  ref={(el) => {
                    legPaths.current[i] = el;
                  }}
                  d={d}
                  data-leg={i}
                  data-walked={i < done || undefined}
                  fill="none"
                  stroke={i < done ? pathStroke.behind : pathStroke.ahead}
                  strokeWidth={pathStroke.strokeWidth}
                  strokeDasharray={pathStroke.dash}
                  strokeLinecap="round"
                />
              ))}
              {spots.map((at, i) => {
                const id = i < done ? "map-spot-done" : "map-spot";
                return (
                  <SlotArt
                    key={at.x}
                    id={id}
                    slot={mapArt[id]}
                    x={at.x}
                    y={at.y}
                  />
                );
              })}
              <SlotArt
                id="map-x"
                slot={mapArt["map-x"]}
                x={chestSpot.x}
                y={chestSpot.y + 30}
              />
              <SlotArt
                id="chest"
                slot={mapArt.chest}
                x={chestSpot.x}
                y={chestSpot.y + 12}
              />
            </svg>
            <div
              ref={walker}
              className={styles.walker}
              data-testid="walker"
              style={{
                left: left(place.x),
                top: top(place.y),
                marginLeft: -walkerPx / 2,
                marginTop: -walkerRise - walkerPx / 2,
              }}
            >
              <div
                className={styles.walkerBody}
                style={{ width: walkerPx, height: walkerPx }}
              >
                <Avatar expression="neutral" size={walkerPx} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {chest !== "none" && (
        <div className={styles.ending} data-testid="ending">
          <div className={styles.chest}>
            {open && <Burst />}
            <div className={styles.chestArt}>
              <SlotImage
                id={open ? "chest-open" : "chest"}
                slot={open ? mapArt["chest-open"] : mapArt.chest}
                size={340}
              />
            </div>
          </div>
          <div className={styles.cheer}>
            <Avatar expression="cheering" size={150} />
          </div>
        </div>
      )}

      {line && (
        <p className={styles.line} aria-live="polite" data-testid="map-line">
          {line}
        </p>
      )}
    </div>
  );
}

function Burst() {
  const ray = mapArt["ending-ray"];
  const coin = mapArt["ending-coin"];
  return (
    <>
      <svg
        viewBox={`0 0 ${ray.width} ${ray.height}`}
        className={styles.rays}
        data-testid="ending-rays"
        aria-hidden="true"
      >
        {Array.from({ length: rays }, (_, i) => (
          <g
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed rays
            key={i}
            transform={`rotate(${(i * 360) / rays} ${ray.anchor.x} ${ray.anchor.y})`}
          >
            {ray.draw()}
          </g>
        ))}
      </svg>
      {Array.from({ length: coins }, (_, i) => {
        const angle = (Math.PI * (i + 0.5)) / coins;
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed coins
            key={i}
            className={styles.coin}
            style={
              {
                "--dx": `${Math.cos(angle) * 260}px`,
                "--dy": `${-Math.sin(angle) * 210}px`,
                animationDelay: `${i * 90}ms`,
              } as CSSProperties
            }
          >
            <SlotImage id="ending-coin" slot={coin} size={coin.width} />
          </span>
        );
      })}
    </>
  );
}
