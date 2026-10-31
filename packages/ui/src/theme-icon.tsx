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
  /** `sm` is a section heading's tile; `md` home's. */
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = { sm: 36, md: 44, lg: 52, xl: 64 } as const;

export function ThemeIcon({
  children,
  tone = "accent",
  variant = "soft",
  size = "lg",
  className,
}: ThemeIconProps) {
  return (
    <MantineThemeIcon
      data-tone={tone}
      size={sizes[size]}
      radius={size === "sm" || size === "md" ? "md" : "lg"}
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
