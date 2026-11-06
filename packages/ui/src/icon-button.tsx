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
  /** A submit button sends its form; it needs no click of its own. */
  onClick?(): void;
  type?: "button" | "submit";
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
  type = "button",
  tone = "accent",
  size = "xl",
  disabled,
  className,
}: IconButtonProps) {
  return (
    <UnstyledButton
      type={type}
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
