// The journey (SPEC.md's Journey section): one giant crystal, a shard per job.
// It lies over the whole game frame, and has no rules in it: it shows where
// the crystal is, how many shards are in, and the shard on its way. The game
// says when each of those changes.

import type { AvatarExpression } from "@repo/game-contract";
import { SlotArt } from "@repo/game-kit/art";
import {
  type ComponentType,
  type CSSProperties,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { art, shardCount, shardFrame, shardSlot } from "./art.tsx";
import styles from "./crystal.module.css";

/** The crystal growing over the machine, or shrinking back. */
export const growMs = 500;
/** The shard appearing over the machine. */
export const riseMs = 280;
/** The shard flying into its place. */
export const flightMs = 850;
/** The crystal's pulse as the shard lands. */
export const landMs = 450;
/** The whole moment between two jobs. */
export const momentMs = growMs + riseMs + flightMs + landMs + growMs;
/** With reduced motion, how long the grown crystal holds, its new shard in place. */
export const stillHoldMs = 1100;
/** The ending, at least: longer if its line takes longer to say. */
export const endingMs = 5000;

/** The crystal's width in its top-row place, in px. */
const seatWidth = 66;
/** The most the grown crystal is wide, in px. */
const mostWidth = 430;
/** How much of the machine's height the grown crystal takes. */
const heightShare = 0.82;
/** How far from the machine's right edge its top-row place is, in px. */
const seatInset = 12;

export type CrystalPose = "big" | "seat";

export interface GiantCrystalProps {
  pose: CrystalPose;
  /** How many shards are in. */
  filled: number;
  /** Which shard is on its way, and whether it's been let go to fly. */
  shard: { index: number; flying: boolean } | null;
  /** Bumped as each shard lands, to pulse the crystal. */
  pulse: number;
  /** The machine is darkened behind the grown crystal. */
  dimmed: boolean;
  /** The ending: the whole screen darkens, and the crystal glows. */
  ending: boolean;
  /** The ending's line, shown over the darkened screen. */
  line: string;
  Avatar: ComponentType<{ expression: AvatarExpression; size: number }>;
}

interface Layout {
  machine: { x: number; y: number; width: number; height: number };
  /** The grown crystal's box. */
  x: number;
  y: number;
  width: number;
  /** The move from there to its top-row place. */
  seat: string;
}

function measure(layer: HTMLElement): Layout | null {
  const frame = layer.parentElement;
  const el = frame?.querySelector('[data-testid="machine"]');
  if (!el) return null;
  const box = layer.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  // Nothing to lay out without real boxes (jsdom).
  if (!r.width || !r.height) return null;
  const machine = {
    x: r.left - box.left,
    y: r.top - box.top,
    width: r.width,
    height: r.height,
  };
  const ratio = shardFrame.height / shardFrame.width;
  const width = Math.min((machine.height * heightShare) / ratio, mostWidth);
  const x = machine.x + (machine.width - width) / 2;
  const y = machine.y + (machine.height - width * ratio) / 2;
  const seatX = machine.x + machine.width - seatWidth - seatInset;
  const seatY = Math.max(0, (machine.y - seatWidth * ratio) / 2);
  return {
    machine,
    x,
    y,
    width,
    seat: `translate(${seatX - x}px, ${seatY - y}px) scale(${seatWidth / width})`,
  };
}

/** The outline with its shards in, or one shard alone, in the outline's frame. */
function CrystalArt(props: { filled: number } | { only: number }) {
  return (
    <svg
      viewBox={`0 0 ${shardFrame.width} ${shardFrame.height}`}
      className={styles.art}
      aria-hidden="true"
    >
      {"only" in props ? (
        <SlotArt
          id={shardSlot(props.only)}
          slot={art[shardSlot(props.only)]}
          x={0}
          y={0}
        />
      ) : (
        <>
          <SlotArt id="giant-crystal" slot={art["giant-crystal"]} x={0} y={0} />
          {Array.from(
            { length: Math.min(props.filled, shardCount) },
            (_, i) => (
              <SlotArt
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed shards
                key={i}
                id={shardSlot(i)}
                slot={art[shardSlot(i)]}
                x={0}
                y={0}
              />
            ),
          )}
        </>
      )}
    </svg>
  );
}

function Burst() {
  const glow = art["crystal-rays"];
  return (
    <svg
      viewBox={`0 0 ${glow.width} ${glow.height}`}
      className={styles.rays}
      data-testid="crystal-rays"
      aria-hidden="true"
    >
      {glow.draw()}
    </svg>
  );
}

export function GiantCrystal(props: GiantCrystalProps) {
  const { pose, filled, shard, pulse, dimmed, ending, line, Avatar } = props;
  const layer = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  // Measure the machine, and again whenever it resizes.
  useLayoutEffect(() => {
    const el = layer.current;
    if (!el) return;
    const update = () => setLayout(measure(el));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(update);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  const box: CSSProperties | undefined = layout
    ? { left: layout.x, top: layout.y, width: layout.width }
    : undefined;

  return (
    <div
      ref={layer}
      className={styles.layer}
      data-testid="giant-crystal"
      data-pose={pose}
      data-filled={filled}
      data-dimmed={dimmed || undefined}
      data-ending={ending || undefined}
      style={
        {
          "--grow-ms": `${growMs}ms`,
          "--rise-ms": `${riseMs}ms`,
          "--flight-ms": `${flightMs}ms`,
          "--land-ms": `${landMs}ms`,
        } as CSSProperties
      }
    >
      <div
        className={styles.scrim}
        data-shown={dimmed || undefined}
        style={
          ending || !layout
            ? { inset: 0 }
            : {
                left: layout.machine.x,
                top: layout.machine.y,
                width: layout.machine.width,
                height: layout.machine.height,
              }
        }
      />
      <div
        className={styles.crystal}
        style={{
          ...box,
          transform: pose === "seat" ? layout?.seat : undefined,
        }}
      >
        {ending && <Burst />}
        <div
          key={pulse}
          className={styles.gem}
          data-pulsing={pulse > 0 || undefined}
        >
          <CrystalArt filled={filled} />
        </div>
      </div>
      {shard && (
        <div
          className={styles.shard}
          data-testid="shard"
          data-index={shard.index}
          data-flying={shard.flying || undefined}
          style={box}
        >
          <div className={styles.shardGlow}>
            <CrystalArt only={shard.index} />
          </div>
        </div>
      )}
      {ending && (
        <>
          <div className={styles.cheer}>
            <Avatar expression="cheering" size={150} />
          </div>
          <p
            className={styles.line}
            aria-live="polite"
            data-testid="ending-line"
          >
            {line}
          </p>
        </>
      )}
    </div>
  );
}
