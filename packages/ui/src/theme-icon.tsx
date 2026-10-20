import { ThemeIcon as MantineThemeIcon } from "@mantine/core";
import type { ReactNode } from "react";
import { cx } from "./cx";
import type { Tone } from "./tone";
import classes from "./tone.module.css";

interface ThemeIconProps {
  children: ReactNode;
  tone?: Tone;
  /** `soft` tints the background; `filled` uses the solid tone colour. */
  variant?: "soft" | "filled";
  size?: "md" | "lg" | "xl";
  className?: string;
}

const sizes = { md: 40, lg: 52, xl: 64 } as const;

export function ThemeIcon({
  children,
  tone = "brand",
  variant = "soft",
  size = "lg",
  className,
}: ThemeIconProps) {
  return (
    <MantineThemeIcon
      data-tone={tone}
      size={sizes[size]}
      radius="lg"
      aria-hidden
      className={cx(
        variant === "filled" ? classes.iconFilled : classes.icon,
        className,
      )}
    >
      {children}
    </MantineThemeIcon>
  );
}
