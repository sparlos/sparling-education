// The avatar drawn in 2D: the student's whole figure, in their look, reacting
// with an expression. Games get it through the game contract's Avatar prop;
// the shell uses it on its own screens, and the wardrobe draws single items.
//
// Plain SVG, so it draws at once and at any size: each item is its PNG, in its
// box in the body frame (`./layout.ts`), and the face is drawn over the body.
import { Fragment, useId } from "react";
import { itemUrl, maskUrl } from "./art.ts";
import { type Brow, faces } from "./faces.ts";
import type { AvatarExpression, AvatarLook } from "./index.ts";
import { frame, hairTop, type Placed, placeLook } from "./layout.ts";
import { type Box, face, items, type Piece } from "./parts.ts";

export interface PortraitProps {
  look: AvatarLook;
  expression: AvatarExpression;
  /** Width and height in px; the figure is centred in that square. */
  size: number;
  /** The accessible name, in the student's locale. */
  label: string;
  /** Unsaved boxes and masks, for the avatar fit tool. Nothing else uses this. */
  draft?: PortraitDraft;
}

export interface PortraitDraft {
  boxes: Readonly<Record<string, Box>>;
  /** A mask's image by piece ID; null for no mask, absent for the saved one. */
  masks: Readonly<Record<string, string | null>>;
}

export function Portrait({
  look,
  expression,
  size,
  label,
  draft,
}: PortraitProps) {
  const placed = placeLook(look).map(
    (piece): Placed => ({ ...piece, ...draft?.boxes[piece.id] }),
  );
  const worn = placed.filter((piece) => piece.slot !== "hat");
  const hats = placed.filter((piece) => piece.slot === "hat");
  const mask = (id: string) =>
    draft && id in draft.masks ? draft.masks[id] : maskUrl(id);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${frame.x} ${frame.y} ${frame.size} ${frame.size}`}
      role="img"
      aria-label={label}
      data-expression={expression}
      style={draft ? { overflow: "visible" } : undefined}
    >
      {worn.map((piece) => (
        <WornPiece
          key={piece.id}
          piece={piece}
          mask={mask(piece.id)}
          top={piece.slot === "hair" ? hairTop(look) : null}
        />
      ))}
      {/* Over the hair, so a long fringe never hides how the avatar feels. */}
      <Face expression={expression} />
      {hats.map((piece) => (
        <WornPiece key={piece.id} piece={piece} mask={mask(piece.id)} />
      ))}
    </svg>
  );
}

/**
 * A picture in its box, with any parts of it blocked out by `mask`, and cut
 * off above `top` if that's within it.
 */
function WornPiece({
  piece,
  mask,
  top = null,
}: {
  piece: Piece & Partial<Pick<Placed, "slot" | "item">>;
  mask?: string | null;
  top?: number | null;
}) {
  const id = `mask${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const box = {
    x: piece.x,
    y: piece.y,
    width: piece.width,
    height: piece.height,
  };
  const image = (
    <image
      href={itemUrl(piece.id)}
      {...box}
      preserveAspectRatio="none"
      data-slot={piece.slot}
      data-item={piece.item}
      mask={mask ? `url(#${id})` : undefined}
    />
  );
  const drawn = mask ? (
    <>
      <mask id={id} maskUnits="userSpaceOnUse" {...box}>
        <image href={mask} {...box} preserveAspectRatio="none" />
      </mask>
      {image}
    </>
  ) : (
    image
  );
  if (top === null || top <= piece.y) return drawn;
  const height = piece.y + piece.height - top;
  // A nested svg clips to its own box.
  return (
    <svg
      aria-hidden="true"
      x={piece.x}
      y={top}
      width={piece.width}
      height={height}
      viewBox={`${piece.x} ${top} ${piece.width} ${height}`}
    >
      {drawn}
    </svg>
  );
}

export interface ItemPictureProps {
  /** An item ID from `@repo/avatar/parts`. */
  item: string;
  /** Width and height in px; the item is centred in that square. */
  size: number;
}

/** The part of a body that shows its head, in body-frame units. */
const head = { x: -118, y: 0, side: 236 };

/**
 * One item on its own, for picking it: a skin tone as the head in that tone,
 * anything else as its picture. Decorative; the button around it is named.
 */
export function ItemPicture({ item: itemId, size }: ItemPictureProps) {
  const item = items.get(itemId);
  if (!item) return null;
  const isHead = item.slot === "body";
  return (
    <svg
      width={size}
      height={size}
      viewBox={
        isHead ? `${head.x} ${head.y} ${head.side} ${head.side}` : "0 0 100 100"
      }
      aria-hidden="true"
      data-item={item.id}
    >
      {isHead ? (
        <>
          {item.pieces[0] && <WornPiece piece={item.pieces[0]} />}
          <Face expression="happy" />
        </>
      ) : (
        <image href={itemUrl(item.id)} width={100} height={100} />
      )}
    </svg>
  );
}

// Drawn to match the art's face: dark brown lines, big round eyes.
const ink = "#2E1A12";
const iris = "#2A140C";
const line = {
  stroke: ink,
  strokeWidth: 3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  fill: "none",
} as const;

function Face({ expression }: { expression: AvatarExpression }) {
  const { eyes, gaze, brows, mouth, mouthOpen } = faces[expression];
  const r = face.eyeRadius;
  return (
    <g data-face={expression}>
      {face.eyes.map(({ x, y }, i) => {
        // Which way is inward, towards the nose.
        const inward = x < 0 ? 1 : -1;
        const brow = brows[i];
        return (
          <Fragment key={x}>
            {eyes[i] === "shut" ? (
              // Shut in a smile.
              <path
                d={`M${x - r} ${y + 4} Q${x} ${y - r} ${x + r} ${y + 4}`}
                {...line}
                strokeWidth={4}
              />
            ) : (
              <>
                {/* White showing only on the outer side, under a heavy lash. */}
                <ellipse
                  cx={x - inward * 3}
                  cy={y + 1}
                  rx={r}
                  ry={r - 2}
                  fill="#FFFFFF"
                />
                <circle
                  cx={x + inward * 3 + gaze.dx}
                  cy={y + gaze.dy}
                  r={r - 1}
                  fill={iris}
                />
                {/* A catchlight, so the eyes look alive. */}
                <circle
                  cx={x + inward * 3 + gaze.dx + 3}
                  cy={y + gaze.dy - 6}
                  r={4}
                  fill="#FFFFFF"
                />
                <path
                  d={`M${x - inward * 3 - r} ${y - 3} Q${x} ${y - r - 8} ${x + inward * 3 + r} ${y - 5}`}
                  {...line}
                  strokeWidth={4}
                />
              </>
            )}
            {brow && <path d={browPath(x, y - r, inward, brow)} {...line} />}
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
  const rest = top - 16 - brow.lift;
  const [inner, outer] = [rest - brow.tilt / 2, rest + brow.tilt / 2];
  // The control point sits twice the arch up, so the curve peaks at the arch.
  const peak = (inner + outer) / 2 - 2 * brow.arch;
  return `M${x + inward * 16} ${inner} Q${x} ${peak} ${x - inward * 16} ${outer}`;
}
