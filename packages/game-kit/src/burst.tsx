// A burst of particles: a "Nice fix!" sparkle, splash droplets, a cheer at
// the goal. Each particle is an HTML element animated with the Web
// Animations API on `transform` and `opacity` only, so the compositor moves
// them without layout or repaint: cheap on a Chromebook, unlike a canvas
// redrawn from JS every frame. Fine up to a few dozen particles at once.
//
// Place it inside a positioned element (`position: relative`); it centres on
// (x, y) in that element's pixels and never takes layout space. With reduced
// motion, a single particle fades in and out in place.
import { type ReactNode, useLayoutEffect, useRef } from "react";

export interface BurstProps {
  /** The centre, in px from the positioned ancestor's top-left. */
  x: number;
  y: number;
  /** One particle, drawn about its own centre (e.g. a `SlotImage`). */
  children: ReactNode;
  count?: number;
  /** How far particles fly, in px. */
  spread?: number;
  /** How long the burst lasts, in ms. Unmount it after this. */
  duration?: number;
}

export function Burst({
  x,
  y,
  children,
  count = 10,
  spread = 70,
  duration = 700,
}: BurstProps) {
  const ref = useRef<HTMLDivElement>(null);
  const still =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const shown = still ? 1 : count;

  useLayoutEffect(() => {
    const parts = [...(ref.current?.children ?? [])] as HTMLElement[];
    const animations = parts.map((el, i) => {
      if (typeof el.animate !== "function") return null;
      if (still)
        return el.animate(
          [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }],
          { duration, fill: "forwards" },
        );
      // Evenly round the circle, each a little off, so no two bursts match.
      const angle = ((i + Math.random() * 0.6) / shown) * 2 * Math.PI;
      const reach = spread * (0.6 + Math.random() * 0.4);
      const dx = Math.cos(angle) * reach;
      const dy = Math.sin(angle) * reach;
      const turn = (Math.random() - 0.5) * 240;
      // Easing per keyframe: an easing on the whole animation would also
      // bend its timeline, and start the fade early.
      return el.animate(
        [
          {
            transform: "translate(0, 0) scale(0.3) rotate(0deg)",
            opacity: 1,
            easing: "cubic-bezier(0.2, 0.7, 0.3, 1)",
          },
          {
            transform: `translate(${dx}px, ${dy}px) scale(1) rotate(${turn}deg)`,
            opacity: 1,
            offset: 0.6,
            easing: "ease-in",
          },
          {
            transform: `translate(${dx * 1.15}px, ${dy * 1.15 + 12}px) scale(0.6) rotate(${turn * 1.3}deg)`,
            opacity: 0,
          },
        ],
        { duration, fill: "forwards" },
      );
    });
    return () => {
      for (const a of animations) a?.cancel();
    };
  }, [still, shown, spread, duration]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-testid="burst"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 0,
        height: 0,
        pointerEvents: "none",
        zIndex: 3,
      }}
    >
      {Array.from({ length: shown }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: particles are interchangeable
          key={i}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            translate: "-50% -50%",
            opacity: 0,
            willChange: "transform, opacity",
          }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
