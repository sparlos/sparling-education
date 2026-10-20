import { Badge as MantineBadge } from "@mantine/core";
import type { ReactNode } from "react";
import { cx } from "./cx";
import type { Tone } from "./tone";
import classes from "./tone.module.css";

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  leftSection?: ReactNode;
  size?: "md" | "lg";
  className?: string;
}

export function Badge({
  children,
  tone = "brand",
  leftSection,
  size = "lg",
  className,
}: BadgeProps) {
  return (
    <MantineBadge
      data-tone={tone}
      size={size}
      leftSection={leftSection}
      className={cx(classes.badge, className)}
    >
      {children}
    </MantineBadge>
  );
}
