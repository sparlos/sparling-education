import { UnstyledButton } from "@mantine/core";
import type { ReactNode } from "react";
import { cx } from "./cx";
import classes from "./icon-button.module.css";
import press from "./press.module.css";
import type { Tone } from "./tone";

interface IconButtonProps {
  /** The icon; decorative, since `label` names the button. */
  children: ReactNode;
  /** What the button does, for screen readers and as a tooltip. */
  label: string;
  onClick(): void;
  tone?: Tone | "neutral";
  /** `lg` is 48 px, the smallest touch target; `xl` is 64 px, for Grades 1–2. */
  size?: "lg" | "xl";
  disabled?: boolean;
  className?: string;
}

export function IconButton({
  children,
  label,
  onClick,
  tone = "accent",
  size = "xl",
  disabled,
  className,
}: IconButtonProps) {
  return (
    <UnstyledButton
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      data-size={size}
      data-tone={tone}
      className={cx(classes.root, press.press, className)}
    >
      {children}
    </UnstyledButton>
  );
}
