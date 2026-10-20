import { Badge as MantineBadge } from "@mantine/core";
import type { ReactNode } from "react";
import type { ButtonTone } from "./button";
import classes from "./tone.module.css";

interface BadgeProps {
  children: ReactNode;
  tone?: ButtonTone;
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
      className={[classes.badge, className].filter(Boolean).join(" ")}
    >
      {children}
    </MantineBadge>
  );
}
