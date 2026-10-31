import type { Tone } from "../tone";
import classes from "./image-slot.module.css";

export interface ImageSlotImage {
  /** Describes the image for screen readers, placeholder or not. */
  alt: string;
  /** The real image. Without it a branded low-poly placeholder is shown. */
  src?: string;
  /** Shown on the placeholder, e.g. "Class hub render". */
  placeholderLabel?: string;
}

interface ImageSlotProps extends ImageSlotImage {
  ratio?: "16/10" | "4/3" | "1/1" | "4/5";
  tone?: Tone;
  shadow?: boolean;
}

/** A fixed-ratio image frame so layouts don't shift when renders arrive. */
export function ImageSlot({
  alt,
  src,
  placeholderLabel,
  ratio = "16/10",
  tone,
  shadow,
}: ImageSlotProps) {
  return (
    <div
      className={classes.root}
      style={{ aspectRatio: ratio }}
      data-tone={tone}
      data-shadow={shadow || undefined}
    >
      {src ? (
        // biome-ignore lint/performance/noImgElement: @repo/ui is framework-agnostic, not Next-only
        <img className={classes.image} src={src} alt={alt} />
      ) : (
        <>
          <LowPolyScene alt={alt} />
          {placeholderLabel && (
            <span className={classes.label} aria-hidden="true">
              {placeholderLabel}
            </span>
          )}
        </>
      )}
    </div>
  );
}

// Stylised low-poly hills, trees and a house, tinted with the current tone.
function LowPolyScene({ alt }: { alt: string }) {
  return (
    <svg
      className={classes.art}
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={alt}
    >
      <circle cx="318" cy="70" r="30" fill="var(--k-sparkle)" />
      <polygon
        points="0,190 70,130 140,175 210,110 290,165 400,120 400,300 0,300"
        fill="var(--tone-fill)"
        opacity="0.22"
      />
      <polygon
        points="0,230 90,180 170,215 260,170 340,205 400,185 400,300 0,300"
        fill="var(--tone-fill)"
        opacity="0.38"
      />
      <polygon
        points="90,180 170,215 120,300 0,300 0,230"
        fill="var(--tone-fill)"
        opacity="0.18"
      />
      <polygon
        points="0,262 120,240 230,258 330,236 400,250 400,300 0,300"
        fill="var(--tone-edge)"
        opacity="0.35"
      />
      {/* trees */}
      <polygon points="70,205 86,160 102,205" fill="var(--k-success)" />
      <polygon
        points="86,160 102,205 92,205"
        fill="var(--k-success)"
        opacity="0.7"
      />
      <polygon points="300,200 318,148 336,200" fill="var(--k-success)" />
      <polygon
        points="318,148 336,200 325,200"
        fill="var(--k-success)"
        opacity="0.7"
      />
      {/* house */}
      <polygon
        points="168,215 168,180 232,180 232,215"
        fill="var(--k-surface-raised)"
      />
      <polygon points="160,184 200,150 240,184" fill="var(--k-brand-fill)" />
      <polygon
        points="200,150 240,184 222,184"
        fill="var(--k-brand-edge)"
        opacity="0.5"
      />
      <rect
        x="192"
        y="194"
        width="16"
        height="21"
        rx="2"
        fill="var(--tone-edge)"
      />
    </svg>
  );
}
