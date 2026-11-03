// Art slots. A game refers to its art by named slot. Each slot draws in a
// fixed frame with an anchor point, either placeholder SVG or a file of real
// art (`fileSlot`). A game keeps its slots in a table
// (`{ ... } satisfies Record<string, Slot>`) and draws them with these.
import type { ReactNode } from "react";

export interface Slot {
  /** The frame, in its own units. */
  width: number;
  height: number;
  /** The point placed at the slot's position, in frame units. */
  anchor: { x: number; y: number };
  draw(): ReactNode;
}

/**
 * A slot drawn from an SVG file, `scale` times the size of the file's own
 * frame (`scaleY` tall, if that differs). The anchor is in the file's units.
 * The file stays its own image, so its gradient IDs can't clash with another's.
 */
export function fileSlot(
  href: string,
  frame: Pick<Slot, "width" | "height" | "anchor">,
  scale = 1,
  scaleY = scale,
): Slot {
  const width = frame.width * scale;
  const height = frame.height * scaleY;
  return {
    width,
    height,
    anchor: { x: frame.anchor.x * scale, y: frame.anchor.y * scaleY },
    draw: () => (
      <image
        href={href}
        width={width}
        height={height}
        preserveAspectRatio="none"
      />
    ),
  };
}

/**
 * Draws a slot inside an SVG, with its anchor at (x, y), `scaleX` wide and
 * `scale` tall. `data-slot` names it, for tests and the browser tour.
 */
export function SlotArt({
  id,
  slot,
  x,
  y,
  scale = 1,
  scaleX = scale,
}: {
  id: string;
  slot: Slot;
  x: number;
  y: number;
  scale?: number;
  scaleX?: number;
}) {
  return (
    <g
      data-slot={id}
      transform={`translate(${x} ${y}) scale(${scaleX} ${scale}) translate(${-slot.anchor.x} ${-slot.anchor.y})`}
    >
      {slot.draw()}
    </g>
  );
}

/** Draws a slot as its own small SVG, `size` px wide, for buttons and the screen. */
export function SlotImage({
  id,
  slot,
  size,
}: {
  id: string;
  slot: Slot;
  size: number;
}) {
  return (
    <svg
      data-slot={id}
      width={size}
      height={(size * slot.height) / slot.width}
      viewBox={`0 0 ${slot.width} ${slot.height}`}
      aria-hidden="true"
    >
      {slot.draw()}
    </svg>
  );
}
