// Hosts the tubes' physics (gems.ts) over the machine: measures each tube,
// draws each place's gem once as a template, and hands the physics what the
// tubes hold after each frame of a run. Rebuilt when the layout changes.
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { Place } from "../strings.ts";
import { art, Gem, gemShapes } from "./art.tsx";
import { type GemEvents, GemTubes, type TubeRect } from "./gems.ts";
import styles from "./machine.module.css";

const svgNs = "http://www.w3.org/2000/svg";
/** How far the gems keep from a tube's glass. */
const inset = 5;

export interface Shown {
  /** Each tube's gems, by place. */
  tubes: readonly number[];
  fused: readonly Place[];
  paced: boolean;
}

interface Layout {
  width: number;
  height: number;
  tubes: TubeRect[];
  /** The biggest gem's radius, in px: nine of them fill a tube. */
  radius: number;
}

const reducedMotion = () =>
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export function GemLayer({
  shown,
  events,
}: {
  shown: Shown;
  events: GemEvents;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const world = useRef<SVGGElement>(null);
  const physics = useRef<GemTubes | null>(null);
  const latest = useRef(shown);
  latest.current = shown;
  const latestEvents = useRef(events);
  latestEvents.current = events;
  const [layout, setLayout] = useState<Layout | null>(null);
  const id = useId().replace(/:/g, "");

  // Measure the tubes (inside the machine), and again whenever it resizes.
  useLayoutEffect(() => {
    const root = svg.current?.parentElement;
    if (!root) return;
    const measure = () => {
      const box = root.getBoundingClientRect();
      const tubes = [
        ...root.querySelectorAll<HTMLElement>('[data-testid="tube"]'),
      ]
        .sort((a, b) => Number(a.dataset.place) - Number(b.dataset.place))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            x: r.left - box.left + inset,
            y: r.top - box.top + inset,
            w: r.width - 2 * inset,
            h: r.height - 2 * inset,
          };
        });
      // Nothing to lay out without real boxes (jsdom).
      if (!box.width || tubes.some((t) => t.w <= 0 || t.h <= 0))
        return setLayout(null);
      // Two across and about five high fill a tube with nine, piled.
      const w = Math.min(...tubes.map((t) => t.w));
      const h = Math.min(...tubes.map((t) => t.h));
      setLayout({
        width: box.width,
        height: box.height,
        tubes,
        radius: Math.min(w / 2.05, h / 4.4) / 2,
      });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(measure);
    watch.observe(root);
    return () => watch.disconnect();
  }, []);

  // A fresh world for each layout, showing what the tubes hold now.
  useEffect(() => {
    const layer = world.current;
    if (!layout || !layer) return;
    const radius = (p: Place) => gemShapes[p].size * layout.radius;
    const use = (href: string) => {
      const el = document.createElementNS(svgNs, "use");
      el.setAttribute("href", href);
      return el;
    };
    const tubes = new GemTubes(
      layer,
      layout.tubes,
      {
        gem: (p) => use(`#${id}-gem-${p}`),
        flash: () => use(`#${id}-fuse`),
        radius,
        sides: (p) => gemShapes[p].sides,
      },
      reducedMotion(),
      {
        landed: () => latestEvents.current.landed(),
        fused: () => latestEvents.current.fused(),
      },
    );
    physics.current = tubes;
    tubes.sync(latest.current.tubes, [], false);
    return () => {
      tubes.destroy();
      physics.current = null;
    };
  }, [layout, id]);

  // Each frame of a run.
  useEffect(() => {
    physics.current?.sync(shown.tubes, shown.fused, shown.paced);
  }, [shown]);

  const fuse = art.fuse;
  return (
    <svg
      ref={svg}
      className={styles.gems}
      width={layout?.width}
      height={layout?.height}
      aria-hidden="true"
      data-testid="gems"
    >
      {layout && (
        <defs>
          {([0, 1, 2, 3, 4, 5] as const).map((p) => (
            <g key={p} id={`${id}-gem-${p}`}>
              <Gem place={p} r={gemShapes[p].size * layout.radius} />
            </g>
          ))}
          <g
            id={`${id}-fuse`}
            transform={`translate(${-fuse.anchor.x} ${-fuse.anchor.y})`}
          >
            {fuse.draw()}
          </g>
        </defs>
      )}
      <g ref={world} />
    </svg>
  );
}
