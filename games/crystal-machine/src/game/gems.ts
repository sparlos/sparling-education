// The gems in the tubes, as physics (founder's call): they fall from the
// chutes, pile up like fruit in a merge game, and when a tube holds ten they
// pull together, flash, and one bigger gem arcs into the tube to its left.
//
// The rules decide how many gems each tube holds after each frame of a run
// (playback.ts); this only shows it. It's imperative: matter-js moves the
// bodies and each frame sets their SVG transforms directly, so React never
// re-renders per frame. Inert where layout can't be measured (jsdom).
import Matter from "matter-js";
import type { Place } from "../strings.ts";
import { fallMs, flyMs, mergeMs } from "./playback.ts";

const { Bodies, Body, Composite, Engine, Events } = Matter;

/** The moments that make a sound. */
export interface GemEvents {
  /** A gem has hit the bottom of its tube, or the pile. */
  landed(): void;
  /** Ten gems have started to pull together. */
  fused(): void;
}

/**
 * The shortest gap between two landing sounds: about one per frame, so a big
 * column sounds like a shower of gems. Raise it for a sparser sound.
 */
export const landGapMs = 15;
/** The shortest gap between two fusing sounds, which are long enough to blur. */
export const fuseGapMs = 60;

/** A tube's inside, in the layer's px. */
export interface TubeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GemDrawing {
  /** A new element drawing the place's gem, centred on (0, 0). */
  gem(place: Place): SVGElement;
  /** A new element drawing the fuse flash, centred on (0, 0). */
  flash(): SVGElement;
  /** The place's gem radius, in px. */
  radius(place: Place): number;
  sides(place: Place): number;
}

interface Tween {
  el: SVGElement;
  from: [number, number];
  to: [number, number];
  /** How high the path arcs above the straight line. */
  lift: number;
  scale: [number, number];
  opacity: [number, number];
  start: number;
  ms: number;
  done?: () => void;
}

const wall = 40;
/** The side walls reach this far above a tube, so gems dropping in stay in. */
const wallAbove = 400;

export class GemTubes {
  private engine = Engine.create({
    enableSleeping: true,
    // Strong, so a gem lands well inside `fallMs`: a fuse never starts mid-air.
    gravity: { x: 0, y: 1, scale: 0.004 },
  });
  private bodies: Matter.Body[][];
  private els = new Map<number, SVGElement>();
  private inFlight: number[];
  /** Fuses waiting for their gems to land, by place. */
  private pending: number[];
  private tweens: Tween[] = [];
  private timers: { at: number; fn: () => void }[] = [];
  private raf = 0;
  private now = 0;
  /** Gems that haven't hit anything yet, by body ID. */
  private falling = new Set<number>();
  private lastLanded = -Infinity;
  private lastFused = -Infinity;

  private layer: SVGGElement;
  private tubes: readonly TubeRect[];
  private draw: GemDrawing;
  private reduced: boolean;
  private events: GemEvents;

  constructor(
    layer: SVGGElement,
    tubes: readonly TubeRect[],
    draw: GemDrawing,
    reduced: boolean,
    events: GemEvents,
  ) {
    this.layer = layer;
    this.tubes = tubes;
    this.draw = draw;
    this.reduced = reduced;
    this.events = events;
    Events.on(this.engine, "collisionStart", ({ pairs }) => {
      let landed = false;
      for (const { bodyA, bodyB } of pairs)
        for (const body of [bodyA, bodyB])
          if (this.falling.delete(body.id)) landed = true;
      if (landed && this.now - this.lastLanded >= landGapMs) {
        this.lastLanded = this.now;
        this.events.landed();
      }
    });
    this.bodies = tubes.map(() => []);
    this.inFlight = tubes.map(() => 0);
    this.pending = tubes.map(() => 0);
    for (const t of tubes)
      Composite.add(this.engine.world, [
        Bodies.rectangle(
          t.x + t.w / 2,
          t.y + t.h + wall / 2,
          t.w + 2 * wall,
          wall,
          { isStatic: true },
        ),
        Bodies.rectangle(
          t.x - wall / 2,
          t.y + t.h / 2 - wallAbove / 2,
          wall,
          t.h + wallAbove,
          { isStatic: true },
        ),
        Bodies.rectangle(
          t.x + t.w + wall / 2,
          t.y + t.h / 2 - wallAbove / 2,
          wall,
          t.h + wallAbove,
          { isStatic: true },
        ),
      ]);
  }

  /**
   * Shows the tubes holding `counts` gems. `fused` tubes fused this frame;
   * In `paced` frames each fuse is played out in turn (the tenth gem
   * lands, the ten merge, one flies left), which playback.ts allows time
   * for. Other frames' fuses all wait for the gems to land, then happen
   * at once.
   */
  sync(counts: readonly number[], fused: readonly Place[], paced: boolean) {
    // Timers and tweens start from now, even if the loop has been idle.
    if (!this.raf && typeof performance !== "undefined")
      this.now = performance.now();
    if (counts.every((n) => n === 0)) return this.clear();
    const job = [...fused].sort((a, b) => a - b);
    if (this.reduced || job.length === 0) {
      for (const p of job) this.merge(p);
      this.reconcile(counts);
      return this.kick();
    }
    if (!paced) {
      // Each fused tube's ten are spoken for, and the tube to its left is
      // owed the gem the fuse sends; drop the rest in now, fuse once landed.
      for (const p of job) {
        this.pending[p] = (this.pending[p] ?? 0) + 1;
        this.inFlight[p + 1] = (this.inFlight[p + 1] ?? 0) + 1;
      }
      this.reconcile(counts);
      this.later(fallMs, () => {
        for (const p of job) {
          this.pending[p] = Math.max(0, (this.pending[p] ?? 0) - 1);
          this.inFlight[p + 1] = Math.max(0, (this.inFlight[p + 1] ?? 0) - 1);
          this.merge(p);
        }
      });
      return this.kick();
    }
    // Settle the tubes the fuses don't touch now, and play the fuses out.
    const touched = new Set(job.flatMap((p) => [p, p + 1]));
    this.reconcile(counts, (p) => !touched.has(p));
    let at = 0;
    for (const [i, p] of job.entries()) {
      if (i === 0 || job[i - 1] !== p - 1) {
        // The drop that makes ten: top the tube up and let it land.
        this.spawn(p as Place, Math.max(0, 10 - this.have(p)));
        at += fallMs;
      }
      this.later(at, () => this.merge(p));
      at += mergeMs + flyMs;
    }
    this.later(at, () => this.reconcile(counts));
    this.kick();
  }

  /** Empties every tube at once. */
  clear() {
    for (const list of this.bodies)
      for (const b of list.splice(0)) this.drop(b);
    for (const t of this.tweens.splice(0)) t.el.remove();
    this.timers = [];
    this.inFlight = this.inFlight.map(() => 0);
    this.pending = this.pending.map(() => 0);
    this.falling.clear();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.clear();
    Events.off(this.engine, "collisionStart");
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }

  private have = (p: number) =>
    (this.bodies[p]?.length ?? 0) +
    (this.inFlight[p] ?? 0) -
    10 * (this.pending[p] ?? 0);

  /** Adds or takes away gems so each tube (where `which` says) holds its count. */
  private reconcile(counts: readonly number[], which = (_p: number) => true) {
    counts.forEach((want, p) => {
      if (!which(p)) return;
      const extra = this.have(p) - want;
      if (extra < 0) this.spawn(p as Place, -extra);
      for (let i = 0; i < extra && this.bodies[p]?.length; i++)
        this.drop(this.bodies[p]?.pop() as Matter.Body);
    });
    if (this.reduced) this.settle();
  }

  /** Drops `n` new gems in from above the tube, staggered so they don't overlap. */
  private spawn(p: Place, n: number, at?: [number, number]) {
    const t = this.tubes[p];
    if (!t || n <= 0) return;
    const r = this.draw.radius(p);
    for (let i = 0; i < n; i++) {
      const [x, y] = at ?? [
        t.x + t.w / 2 + (Math.random() - 0.5) * Math.max(0, t.w - 2.4 * r),
        t.y - r - i * 2.2 * r,
      ];
      const body = Bodies.polygon(x, y, this.draw.sides(p), r, {
        restitution: 0.15,
        friction: 0.4,
        frictionStatic: 0.6,
        angle: Math.random() * Math.PI,
      });
      Body.setVelocity(body, { x: 0, y: 4 });
      Composite.add(this.engine.world, body);
      this.falling.add(body.id);
      const el = this.draw.gem(p);
      this.layer.appendChild(el);
      this.els.set(body.id, el);
      this.bodies[p]?.push(body);
      this.place(body);
    }
  }

  private drop(body: Matter.Body) {
    this.falling.delete(body.id);
    Composite.remove(this.engine.world, body);
    this.els.get(body.id)?.remove();
    this.els.delete(body.id);
  }

  /**
   * Ten gems in tube `p` pull together and flash, and one gem of the next
   * place arcs from there into the tube to the left.
   */
  private merge(p: Place) {
    if (this.now - this.lastFused >= fuseGapMs) {
      this.lastFused = this.now;
      this.events.fused();
    }
    // The oldest ten: gems dropped in since belong to the tube's next ten.
    const list = this.bodies[p] ?? [];
    const ten = list.splice(0, 10);
    // A gem still flying in counts toward the ten.
    const short = 10 - ten.length;
    if (short > 0 && (this.inFlight[p] ?? 0) > 0)
      this.inFlight[p] = Math.max(0, (this.inFlight[p] ?? 0) - short);
    const t = this.tubes[p];
    if (!t) return;
    const [cx, cy] = ten.length
      ? [
          ten.reduce((s, b) => s + b.position.x, 0) / ten.length,
          ten.reduce((s, b) => s + b.position.y, 0) / ten.length,
        ]
      : [t.x + t.w / 2, t.y + t.h / 2];
    for (const b of ten) {
      this.falling.delete(b.id);
      Composite.remove(this.engine.world, b);
      const el = this.els.get(b.id);
      this.els.delete(b.id);
      if (el)
        this.tween({
          el,
          from: [b.position.x, b.position.y],
          to: [cx, cy],
          lift: 0,
          scale: [1, 0.4],
          opacity: [1, 0.2],
          ms: mergeMs,
          done: () => el.remove(),
        });
    }
    const next = (p + 1) as Place;
    const target = this.tubes[next];
    this.inFlight[next] = (this.inFlight[next] ?? 0) + 1;
    const land = () => {
      if ((this.inFlight[next] ?? 0) <= 0) return;
      this.inFlight[next] = (this.inFlight[next] ?? 0) - 1;
      if (target)
        this.spawn(next, 1, [
          target.x + target.w / 2,
          target.y - this.draw.radius(next),
        ]);
    };
    this.later(mergeMs, () => {
      const flash = this.draw.flash();
      this.layer.appendChild(flash);
      this.tween({
        el: flash,
        from: [cx, cy],
        to: [cx, cy],
        lift: 0,
        scale: [0.4, 1.3],
        opacity: [1, 0],
        ms: 300,
        done: () => flash.remove(),
      });
      if (!target) return;
      const flyer = this.draw.gem(next);
      this.layer.appendChild(flyer);
      this.tween({
        el: flyer,
        from: [cx, cy],
        to: [target.x + target.w / 2, target.y - this.draw.radius(next)],
        lift: 60,
        scale: [0.5, 1],
        opacity: [1, 1],
        ms: flyMs,
        done: () => {
          flyer.remove();
          land();
        },
      });
    });
  }

  private later(ms: number, fn: () => void) {
    if (this.reduced || ms <= 0) return fn();
    this.timers.push({ at: this.now + ms, fn });
  }

  private tween(t: Omit<Tween, "start">) {
    if (this.reduced) {
      t.el.remove();
      return t.done?.();
    }
    this.tweens.push({ ...t, start: this.now });
    this.drawTween({ ...t, start: this.now }, 0);
  }

  private drawTween(t: Tween, k: number) {
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    const x = t.from[0] + (t.to[0] - t.from[0]) * e;
    const y = t.from[1] + (t.to[1] - t.from[1]) * e - t.lift * 4 * k * (1 - k);
    const s = t.scale[0] + (t.scale[1] - t.scale[0]) * e;
    t.el.setAttribute(
      "transform",
      `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)})`,
    );
    t.el.setAttribute(
      "opacity",
      String(t.opacity[0] + (t.opacity[1] - t.opacity[0]) * k),
    );
  }

  private place(body: Matter.Body) {
    this.els
      .get(body.id)
      ?.setAttribute(
        "transform",
        `translate(${body.position.x.toFixed(1)} ${body.position.y.toFixed(1)}) rotate(${((body.angle * 180) / Math.PI).toFixed(1)})`,
      );
  }

  /** Reduced motion: no falling, the gems are simply there, settled. */
  private settle() {
    for (let i = 0; i < 120; i++) Engine.update(this.engine, 1000 / 60);
    for (const list of this.bodies) for (const b of list) this.place(b);
  }

  private kick() {
    if (this.reduced) return this.settle();
    if (this.raf || typeof requestAnimationFrame === "undefined") return;
    this.raf = requestAnimationFrame((t) => this.tick(t));
  }

  private tick(time: number) {
    this.now = time;
    Engine.update(this.engine, 1000 / 60);
    for (const list of this.bodies) for (const b of list) this.place(b);
    for (const timer of this.timers.filter((x) => x.at <= time)) {
      this.timers.splice(this.timers.indexOf(timer), 1);
      timer.fn();
    }
    for (const t of [...this.tweens]) {
      const k = Math.min(1, (time - t.start) / t.ms);
      this.drawTween(t, k);
      if (k >= 1) {
        this.tweens.splice(this.tweens.indexOf(t), 1);
        t.done?.();
      }
    }
    const moving =
      this.timers.length > 0 ||
      this.tweens.length > 0 ||
      this.bodies.some((list) => list.some((b) => !b.isSleeping));
    this.raf = moving ? requestAnimationFrame((t) => this.tick(t)) : 0;
  }
}
