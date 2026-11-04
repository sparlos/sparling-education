// The volley's punch: the towers kick and flash, darts fly to the bug they stop,
// bugs burst, glass shatters and the wall takes the hit. None of it decides
// anything: the picture's real state comes in as props, and these are throwaway
// animations on top. Each kind is a fixed pool of elements animated on
// `transform` and `opacity` with the Web Animations API, so a volley of 1800
// darts costs a Chromebook no more than one of 18. Reduced motion skips it all.
import { motion } from "@repo/tokens";
import { type RefObject, useEffect, useRef } from "react";
import type { Wave } from "../rules/parts.ts";
import { panesBroken, volleyAt } from "../rules/volley.ts";
import { Art, type ArtSlot, panePlace, paneSize } from "./art.tsx";
import styles from "./game.module.css";
import { bugAt, type Swarm } from "./swarm.ts";

export const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/** How long a dart takes to fly. A volley's first bug goes down once it lands. */
export const flightMs = motion.duration.base;

export type EffectSound = "dart-fire" | "bug-pop" | "glass-smash" | "wall-thud";

export const towerX = 84;
export const towerYs = [150, 228, 306, 384, 462];
/** A tower's muzzle, from its middle (art/tower.svg). */
const muzzle = { x: 20.5, y: 3 };
const dartLength = 54;
const dartScale = 1.35;

/** The pane that's the `k`th (from 0) to break: panes break in a scattered order. */
export const paneBreaking = (k: number) => (k * 13) % 18;
/** Whether pane `i` is broken, once `broken` have. */
export const paneIsBroken = (i: number, broken: number) =>
  (i * 7) % 18 < broken;

export interface VolleyPlan {
  darts: number;
  ms: number;
}

export interface EffectsProps {
  swarm: Swarm | null;
  wave: Wave | null;
  spent: number;
  /** The volley in the air. */
  plan: VolleyPlan | null;
  wallHit: boolean;
  tones: readonly string[];
  at: {
    greenhouse: { x: number; y: number };
    /** The wall's face, where the bugs hit it. */
    wallFace: number;
  };
  refs: {
    scene: RefObject<SVGSVGElement | null>;
    greenhouse: RefObject<SVGGElement | null>;
    wall: RefObject<SVGGElement | null>;
  };
  sound(id: EffectSound, rate?: number): void;
}

type Frames = Keyframe[];

const play = (el: Element | undefined, frames: Frames, duration: number) =>
  el?.animate?.(frames, { duration, easing: "linear" });

/** A row of same pieces, reused round and round. */
function usePool() {
  const items = useRef<SVGGElement[]>([]);
  const next = useRef(0);
  return {
    ref: (i: number) => (el: SVGGElement | null) => {
      if (el) items.current[i] = el;
    },
    take: () => {
      const el = items.current[next.current % items.current.length];
      next.current += 1;
      return el;
    },
  };
}

function Pool({
  slot,
  size,
  pool,
}: {
  slot: ArtSlot;
  size: number;
  pool: ReturnType<typeof usePool>;
}) {
  return (
    <>
      {Array.from({ length: size }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a fixed pool
        <g key={i} ref={pool.ref(i)} className={styles.pooled}>
          <Art slot={slot} x={0} y={0} />
        </g>
      ))}
    </>
  );
}

export function Effects(props: EffectsProps) {
  const { swarm, wave, spent, plan, wallHit, tones, at, refs, sound } = props;
  const darts = usePool();
  const flashes = usePool();
  const poofs = usePool();
  const bits = usePool();
  const shards = usePool();
  const towers = useRef<SVGGElement[]>([]);
  const nextTower = useRef(0);
  const shaking = useRef<{ size: number; until: number }>({
    size: 0,
    until: 0,
  });
  const heard = useRef<Partial<Record<EffectSound, number>>>({});
  const seen = useRef(0);
  // The latest props, for the timers a volley sets when it starts.
  const latest = useRef(props);
  latest.current = props;

  /** A sound, unless the same one has only just played. */
  const once = (id: EffectSound, gapMs: number, rate?: number) => {
    const now = performance.now();
    if (now - (heard.current[id] ?? -gapMs) < gapMs) return;
    heard.current[id] = now;
    sound(id, rate);
  };

  /** Shakes the picture, unless a bigger shake is still going. */
  const shake = (size: number, ms: number) => {
    const now = performance.now();
    if (size < shaking.current.size && now < shaking.current.until) return;
    shaking.current = { size, until: now + ms };
    const move = (x: number, y: number) => ({
      transform: `translate(${x * size}px, ${y * size}px)`,
    });
    play(
      refs.scene.current ?? undefined,
      [
        move(0, 0),
        move(-1, 0.5),
        move(0.8, -0.8),
        move(-0.5, 0.6),
        move(0.3, -0.3),
        move(0, 0),
      ],
      ms,
    );
  };

  /** Bits thrown out from a point. */
  const throwBits = (
    pool: ReturnType<typeof usePool>,
    x: number,
    y: number,
    count: number,
    reach: number,
    colour?: string,
    fall = 18,
  ) => {
    for (let i = 0; i < count; i++) {
      const el = pool.take();
      if (!el) return;
      if (colour) el.style.color = colour;
      const a = ((i + Math.random()) / count) * 2 * Math.PI;
      const r = reach * (0.55 + Math.random() * 0.45);
      const spin = (Math.random() - 0.5) * 360;
      const size = 0.7 + Math.random() * 0.6;
      play(
        el,
        [
          {
            transform: `translate(${x}px, ${y}px) scale(${size})`,
            opacity: 1,
          },
          {
            transform: `translate(${x + Math.cos(a) * r}px, ${y + Math.sin(a) * r}px) rotate(${spin}deg) scale(${size})`,
            opacity: 1,
            offset: 0.65,
          },
          {
            transform: `translate(${x + Math.cos(a) * r * 1.1}px, ${y + Math.sin(a) * r * 1.1 + fall}px) rotate(${spin * 1.3}deg) scale(${size * 0.5})`,
            opacity: 0,
          },
        ],
        motion.duration.slow + 80,
      );
    }
  };

  /** Where dart `k` is going: a bug, or for an extra, the pane it breaks. */
  const targetOf = (k: number) => {
    const now = latest.current;
    if (!now.swarm || !now.wave) return null;
    const bug = bugAt(now.swarm, k);
    if (bug) return bug;
    const pane = paneBreaking(
      panesBroken(k - now.wave.total + 1, now.wave.total) - 1,
    );
    const place = panePlace(pane);
    return {
      x: at.greenhouse.x + place.x + paneSize / 2,
      y: at.greenhouse.y + place.y + paneSize / 2,
    };
  };

  /** One tower kicks and flashes, and dart `k` flies. */
  const shoot = (k: number) => {
    const target = targetOf(k);
    if (!target) return;
    const t = nextTower.current++ % towerYs.length;
    const y = (towerYs[t] as number) + muzzle.y;
    const x = towerX + muzzle.x;
    const dx = target.x - x;
    const dy = target.y - y;
    const length = Math.hypot(dx, dy) || 1;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const along = (d: number) =>
      `translate(${x + (dx / length) * d}px, ${y + (dy / length) * d}px) rotate(${angle}deg) scale(${dartScale})`;
    play(
      darts.take(),
      [
        { transform: along(0), opacity: 1 },
        { transform: along(Math.max(0, length - dartLength)), opacity: 1 },
      ],
      flightMs,
    );
    play(
      towers.current[t],
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-7px)", offset: 0.25 },
        { transform: "translateX(0)" },
      ],
      motion.duration.slow - 120,
    );
    const flash = (s: number) => ({
      transform: `translate(${x + 4}px, ${y}px) scale(${s}) rotate(${s * 40}deg)`,
    });
    play(
      flashes.take(),
      [
        { ...flash(0.5), opacity: 1 },
        { ...flash(1.1), opacity: 1, offset: 0.4 },
        { ...flash(0.6), opacity: 0 },
      ],
      motion.duration.fast,
    );
    once("dart-fire", 70, 0.9 + Math.random() * 0.3);
  };

  // The volley: darts leave so that each lands when its bug goes down. A big
  // volley sends one dart a tower each beat, a thick stream; a small one sends
  // one a bug.
  // Only a new volley starts this; `shoot` reads the latest props.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useEffect(() => {
    if (!plan || reducedMotion()) return;
    const landing = plan.ms - flightMs;
    const beats = Math.max(1, Math.ceil(landing / 60));
    const timers = Array.from({ length: beats }, (_, beat) =>
      window.setTimeout(
        () => {
          const from = Math.floor((plan.darts * beat) / beats);
          const to = Math.floor((plan.darts * (beat + 1)) / beats);
          const count = Math.min(towerYs.length, to - from);
          for (let c = 0; c < count; c++)
            shoot(from + Math.floor(((to - from) * c) / count));
        },
        (beat * landing) / beats,
      ),
    );
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [plan]);

  // Bugs go down and glass breaks as the count of darts landed moves on.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs as `spent` moves; the helpers are only ever called from here
  useEffect(() => {
    const before = seen.current;
    seen.current = spent;
    if (spent <= before || !swarm || !wave || reducedMotion()) return;
    const landed = Math.min(spent, wave.total);
    const stopped = landed - Math.min(before, wave.total);
    const count = Math.min(5, stopped);
    for (let c = 0; c < count; c++) {
      const bug = bugAt(
        swarm,
        Math.min(before, wave.total) + Math.floor((stopped * c) / count),
      );
      if (!bug) continue;
      const colour = tones[bug.part % tones.length];
      const size = swarm.mode === "bugs" ? swarm.cell / 36 : 0.8;
      const puff = (s: number) => ({
        transform: `translate(${bug.x}px, ${bug.y}px) scale(${s * size})`,
      });
      const el = poofs.take();
      if (el && colour) el.style.color = colour;
      play(
        el,
        [
          { ...puff(0.6), opacity: 1 },
          { ...puff(1.25), opacity: 1, offset: 0.35 },
          { ...puff(1.5), opacity: 0 },
        ],
        motion.duration.slow - 60,
      );
      throwBits(bits, bug.x, bug.y, 3, 30 + 14 * size, colour);
    }
    if (count > 0) once("bug-pop", 80, 0.85 + Math.random() * 0.4);

    const left = volleyAt(wave, before).left;
    const now = volleyAt(wave, spent);
    let cleared = false;
    swarm.parts.forEach((placed, i) => {
      if ((left[i] ?? 0) > 0 && (now.left[i] ?? 0) === 0) {
        cleared = true;
        throwBits(
          bits,
          placed.x + placed.width / 2,
          placed.y + placed.height / 2,
          8,
          70,
          tones[i % tones.length],
        );
      }
    });

    const broken = volleyAt(wave, before).broken;
    for (let b = broken; b < now.broken; b++) {
      const place = panePlace(paneBreaking(b));
      throwBits(
        shards,
        at.greenhouse.x + place.x + paneSize / 2,
        at.greenhouse.y + place.y + paneSize / 2,
        5,
        60,
        undefined,
        40,
      );
    }
    if (now.broken > broken) {
      once("glass-smash", 110, 0.9 + Math.random() * 0.25);
      shake(4, motion.duration.slow);
      play(
        refs.greenhouse.current ?? undefined,
        [
          {
            transform: `translate(${at.greenhouse.x}px, ${at.greenhouse.y}px)`,
          },
          {
            transform: `translate(${at.greenhouse.x + 5}px, ${at.greenhouse.y - 2}px) rotate(1deg)`,
            offset: 0.25,
          },
          {
            transform: `translate(${at.greenhouse.x - 3}px, ${at.greenhouse.y}px) rotate(-0.6deg)`,
            offset: 0.6,
          },
          {
            transform: `translate(${at.greenhouse.x}px, ${at.greenhouse.y}px)`,
          },
        ],
        motion.duration.slow,
      );
    } else if (cleared) shake(5, motion.duration.slow);
    else shake(1.5, motion.duration.fast);
  }, [spent]);

  // What's left of the swarm slams into the wall.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs only when the wall is hit
  useEffect(() => {
    if (!wallHit || reducedMotion()) return;
    once("wall-thud", 0);
    shake(9, motion.duration.slow + 120);
    play(
      refs.wall.current ?? undefined,
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-7px)", offset: 0.2 },
        { transform: "translateX(0)" },
      ],
      motion.duration.slow,
    );
    for (const y of [150, 240, 330, 420])
      throwBits(bits, at.wallFace, y, 3, 46, tones[0]);
  }, [wallHit]);

  return (
    <>
      {towerYs.map((y, i) => (
        <g
          key={y}
          ref={(el) => {
            if (el) towers.current[i] = el;
          }}
        >
          <Art slot="tower" x={towerX} y={y} />
        </g>
      ))}
      {plan && (
        <g data-testid="darts">
          <Pool slot="dart" size={24} pool={darts} />
        </g>
      )}
      <Pool slot="flash" size={5} pool={flashes} />
      <Pool slot="poof" size={12} pool={poofs} />
      <Pool slot="bit" size={44} pool={bits} />
      <Pool slot="shard" size={30} pool={shards} />
    </>
  );
}
