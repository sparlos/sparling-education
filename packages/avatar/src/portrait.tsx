// The avatar drawn in 2D: the student's whole figure, in their look, reacting
// with an expression. Games get it through the game contract's Avatar prop;
// the shell uses it on its own screens, and the wardrobe draws single items.
//
// Plain SVG, so it draws at once and at any size. Each tintable layer is
// coloured by an SVG filter that looks its grey up in the item's ramp (see
// `rampTables`), the face layer is multiplied over it and the ink drawn on
// top, as art/README.md describes. Every part is drawn at its body-frame size
// (`./layout.ts`), whatever its PNGs' resolution, so sharper art drops in.
import { color } from "@repo/tokens";
import { Fragment, useId } from "react";
import { layerUrls } from "./art.ts";
import { type Brow, faces } from "./faces.ts";
import type { AvatarExpression, AvatarLook } from "./index.ts";
import { frame, type Placement, placeLook } from "./layout.ts";
import { face, items, type Ramp, rampTables, shapes } from "./parts.ts";

export interface PortraitProps {
  look: AvatarLook;
  expression: AvatarExpression;
  /** Width and height in px; the figure is centred in that square. */
  size: number;
  /** The accessible name, in the student's locale. */
  label: string;
}

export function Portrait({ look, expression, size, label }: PortraitProps) {
  const id = useSvgId();
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${frame.x} ${frame.y} ${frame.size} ${frame.size}`}
      role="img"
      aria-label={label}
      data-expression={expression}
    >
      {placeLook(look).map((placement, i) => (
        // Placements are back to front and never reorder for a look.
        // biome-ignore lint/suspicious/noArrayIndexKey: see above
        <Fragment key={i}>
          <Part placement={placement} id={`${id}-${i}`} />
          {placement.slot === "body" && <Face expression={expression} />}
        </Fragment>
      ))}
    </svg>
  );
}

export interface ItemPictureProps {
  /** An item ID from `@repo/avatar/parts`. */
  item: string;
  /** Width and height in px; the item is centred in that square. */
  size: number;
}

/**
 * One item on its own, for picking it: a skin tone as the head in that tone,
 * anything else as its drawing. Decorative; the button around it is named.
 */
export function ItemPicture({ item: itemId, size }: ItemPictureProps) {
  const id = useSvgId();
  const item = items.get(itemId);
  const shape = item && shapes.get(item.shape);
  if (!item || !shape) return null;
  const { width, height } = shape;
  const head = item.slot === "body";
  // The body is shown from the top down to the neck, a square as wide as it is.
  const side = head ? width : Math.max(width, height);
  const viewBox = head
    ? `${-width / 2} 0 ${side} ${side}`
    : `${-side / 2} ${-side / 2} ${side} ${side}`;
  const placement: Placement = {
    slot: item.slot,
    item,
    shape,
    x: -width / 2,
    y: head ? 0 : -height / 2,
    width,
    height,
    mirrored: false,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      aria-hidden="true"
      data-item={item.id}
    >
      <Part placement={placement} id={id} />
      {head && <Face expression="happy" />}
    </svg>
  );
}

/** A unique ID that's safe inside `url(#…)`. */
function useSvgId() {
  return `avatar${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function Part({ placement, id }: { placement: Placement; id: string }) {
  const { slot, item, shape, mirrored } = placement;
  const urls = layerUrls(shape.id);
  const box = {
    x: placement.x,
    y: placement.y,
    width: placement.width,
    height: placement.height,
    preserveAspectRatio: "none",
  };
  return (
    <g
      data-slot={slot}
      data-item={item.id}
      transform={mirrored ? "scale(-1 1)" : undefined}
    >
      {item.ramp ? (
        <>
          <Tint id={id} ramp={item.ramp} />
          <image href={urls.fill} {...box} filter={`url(#${id})`} />
          {urls.face && (
            <image
              href={urls.face}
              {...box}
              style={{ mixBlendMode: "multiply" }}
            />
          )}
          <image href={urls.ink} {...box} />
        </>
      ) : (
        <image href={urls.colour} {...box} />
      )}
    </g>
  );
}

/** Colours a grey fill layer with a ramp. */
function Tint({ id, ramp }: { id: string; ramp: Ramp }) {
  const [r, g, b] = rampTables(ramp);
  return (
    <filter id={id} colorInterpolationFilters="sRGB">
      <feComponentTransfer>
        <feFuncR type="table" tableValues={r.join(" ")} />
        <feFuncG type="table" tableValues={g.join(" ")} />
        <feFuncB type="table" tableValues={b.join(" ")} />
      </feComponentTransfer>
    </filter>
  );
}

const ink = color.ink.default;
const line = {
  stroke: ink,
  strokeWidth: 1.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  fill: "none",
} as const;

function Face({ expression }: { expression: AvatarExpression }) {
  const { eyes, gaze, brows, mouth, mouthOpen } = faces[expression];
  const ry = face.eyeHeight / 2;
  const middle = (face.eyes[0]?.x ?? 0) / 2 + (face.eyes[1]?.x ?? 0) / 2;
  return (
    <g data-face={expression}>
      {face.eyes.map(({ x, y }, i) => {
        // Which way is inward, towards the nose.
        const inward = x < middle ? 1 : -1;
        const brow = brows?.[i];
        return (
          <Fragment key={x}>
            {eyes[i] === "shut" ? (
              // Shut in a smile.
              <path
                d={`M${x - 2.6} ${y + 0.8} Q${x} ${y - 2.8} ${x + 2.6} ${y + 0.8}`}
                {...line}
              />
            ) : (
              <>
                <ellipse
                  cx={x + gaze.dx}
                  cy={y + gaze.dy}
                  rx={ry * 0.8}
                  ry={ry}
                  fill={ink}
                />
                {/* A catchlight, so the eyes look alive. */}
                <circle
                  cx={x + gaze.dx + 0.8}
                  cy={y + gaze.dy - 1.1}
                  r={0.75}
                  fill="#FFFFFF"
                />
              </>
            )}
            {brow && <path d={browPath(x, y - ry, inward, brow)} {...line} />}
          </Fragment>
        );
      })}
      <path
        d={mouth}
        transform={`translate(${face.mouth.x} ${face.mouth.y})`}
        {...line}
        fill={mouthOpen ? ink : "none"}
      />
    </g>
  );
}

/** A brow over the eye centred at `x` whose top is at `top`. */
function browPath(x: number, top: number, inward: number, brow: Brow) {
  const rest = top - 2.2 - brow.lift;
  const [inner, outer] = [rest - brow.tilt / 2, rest + brow.tilt / 2];
  // The control point sits twice the arch up, so the curve peaks at the arch.
  const peak = (inner + outer) / 2 - 2 * brow.arch;
  return `M${x + inward * 2.4} ${inner} Q${x} ${peak} ${x - inward * 2.4} ${outer}`;
}
