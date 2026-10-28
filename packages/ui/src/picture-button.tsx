import { UnstyledButton } from "@mantine/core";
import type { ReactNode } from "react";
import { cx } from "./cx";
import classes from "./picture-button.module.css";
import press from "./press.module.css";
import type { Tone } from "./tone";

interface PictureButtonProps {
  /** The picture; decorative, since `label` names the button. */
  children: ReactNode;
  /** What the button picks, for screen readers and as a tooltip. */
  label: string;
  onClick(): void;
  /** Picked, as a toggle: shown with a heavy ring and `aria-pressed`. */
  selected?: boolean;
  tone?: Tone | "neutral";
  /** Width and height in rem. At least 3 (48 px), 4 (64 px) for Grades 1–2. */
  size?: number;
  disabled?: boolean;
  className?: string;
}

/** A square button that is a picture of what it picks: an outfit piece, a colour. */
export function PictureButton({
  children,
  label,
  onClick,
  selected = false,
  tone = "neutral",
  size = 5,
  disabled,
  className,
}: PictureButtonProps) {
  return (
    <UnstyledButton
      type="button"
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={onClick}
      disabled={disabled}
      data-tone={tone}
      data-selected={selected || undefined}
      style={{ width: `${size}rem`, height: `${size}rem` }}
      className={cx(classes.root, press.press, className)}
    >
      {children}
    </UnstyledButton>
  );
}
