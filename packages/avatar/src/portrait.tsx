// The avatar's 2D portrait: the student's head, in their
// look, reacting with an expression. Games get it through the game contract's
// Avatar prop; the shell uses it on its own screens.
//
// Art frame: a 100×100 viewBox. The head is a circle at (50, 56), r 38, so its
// top is at y 18. Eyes are drawn centred on (0, 0) and placed at each eye
// anchor. Headwear is drawn in frame coordinates, sits on the head's top and
// stays above y 34, so the brows (y 36–42) show in every expression.
// Real art replaces a placeholder by registering under the same item ID with
// the same frame.
import { color, palette } from "@repo/tokens";
import type { ReactNode } from "react";
import {
  type AvatarExpression,
  type AvatarLook,
  bodies,
  type EyesId,
  type HeadwearId,
} from "./index.ts";

const line = color.ink.default;
const stroke = {
  stroke: line,
  strokeWidth: 3,
  strokeLinejoin: "round",
} as const;

const eyeAnchors = [
  { x: 37, y: 53 },
  { x: 63, y: 53 },
];

/** An open eye, looking `dx`, `dy` away from straight ahead. */
const eyeArt: Record<EyesId, (gaze: { dx: number; dy: number }) => ReactNode> =
  {
    round: ({ dx, dy }) => (
      <ellipse cx={dx} cy={dy} rx="5" ry="7" fill={line} />
    ),
    sparkle: ({ dx, dy }) => (
      <>
        <ellipse cx={dx} cy={dy} rx="5.5" ry="7.5" fill={line} />
        <circle cx={dx - 1.5} cy={dy - 3} r="2" fill={color.surface.raised} />
      </>
    ),
    sleepy: ({ dx, dy }) => (
      <>
        <path
          d={`M${dx - 5} ${dy - 1} A5 6 0 0 0 ${dx + 5} ${dy - 1} Z`}
          fill={line}
        />
        <path
          d={`M${dx - 7} ${dy - 2} L${dx + 7} ${dy - 2}`}
          {...stroke}
          strokeLinecap="round"
        />
      </>
    ),
  };

const beanie = palette.berry[5];

const headwearArt: Record<HeadwearId, ReactNode> = {
  cap: (
    <>
      <path
        d="M21 32 A38 38 0 0 1 79 32 Z"
        fill={color.brand.fill}
        {...stroke}
      />
      <path
        d="M60 32 Q78 27 94 33 Q78 35 60 34 Z"
        fill={color.brand.fill}
        {...stroke}
      />
    </>
  ),
  beanie: (
    <>
      <path d="M21 32 A38 38 0 0 1 79 32 Z" fill={beanie} {...stroke} />
      <rect
        x="17"
        y="26"
        width="66"
        height="8"
        rx="4"
        fill={beanie}
        {...stroke}
      />
      <circle cx="50" cy="12" r="6" fill={beanie} {...stroke} />
    </>
  ),
  crown: (
    <path
      d="M30 28 L30 8 L40 18 L50 4 L60 18 L70 8 L70 28 Z"
      fill={bodies.sunshine}
      {...stroke}
    />
  ),
};

const gazes: Record<AvatarExpression, { dx: number; dy: number }> = {
  neutral: { dx: 0, dy: 0 },
  happy: { dx: 0, dy: 0 },
  thinking: { dx: 2, dy: -3 },
  encouraging: { dx: 0, dy: 0 },
  cheering: { dx: 0, dy: 0 },
};

const brows: Partial<Record<AvatarExpression, string>> = {
  thinking: "M30 42 L44 38 M56 38 L70 40",
  encouraging: "M30 40 L44 42 M56 42 L70 40",
  cheering: "M30 38 L44 36 M56 36 L70 38",
};

const mouths: Record<AvatarExpression, string> = {
  neutral: "M38 74 Q50 78 62 74",
  happy: "M36 70 Q50 84 64 70",
  thinking: "M42 76 Q50 74 58 76",
  encouraging: "M38 72 Q50 80 62 72",
  cheering: "M34 68 Q50 92 66 68 Z",
};

export interface PortraitProps {
  look: AvatarLook;
  expression: AvatarExpression;
  /** Width and height in px. */
  size: number;
  /** The accessible name, in the student's locale. */
  label: string;
}

export function Portrait({ look, expression, size, label }: PortraitProps) {
  const brow = brows[expression];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
      data-expression={expression}
    >
      <circle
        cx="50"
        cy="56"
        r="38"
        fill={bodies[look.body]}
        data-slot="body"
        data-item={look.body}
        {...stroke}
      />
      <g data-slot="eyes" data-item={look.eyes}>
        {eyeAnchors.map(({ x, y }) => (
          <g key={x} transform={`translate(${x} ${y})`}>
            {expression === "cheering" ? (
              // Eyes closed in a grin, whatever their style.
              <path
                d="M-6 2 Q0 -6 6 2"
                {...stroke}
                strokeLinecap="round"
                fill="none"
              />
            ) : (
              eyeArt[look.eyes](gazes[expression])
            )}
          </g>
        ))}
      </g>
      {brow && <path d={brow} {...stroke} strokeLinecap="round" fill="none" />}
      <path
        d={mouths[expression]}
        {...stroke}
        strokeLinecap="round"
        fill={expression === "cheering" ? line : "none"}
      />
      {look.headwear && (
        <g data-slot="headwear" data-item={look.headwear}>
          {headwearArt[look.headwear]}
        </g>
      )}
    </svg>
  );
}
