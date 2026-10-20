import { Card as MantineCard } from "@mantine/core";
import type { ReactNode } from "react";
import type { ButtonTone } from "./button";
import classes from "./tone.module.css";

interface CardProps {
  children: ReactNode;
  /** `soft` tints the card with its tone; `raised` is plain white. */
  variant?: "raised" | "soft";
  tone?: ButtonTone;
  padding?: "md" | "lg" | "xl";
  className?: string;
}

/** A static content card. For clickable cards use `marketing/role-card`. */
export function Card({
  children,
  variant = "raised",
  tone,
  padding = "xl",
  className,
}: CardProps) {
  return (
    <MantineCard
      data-tone={tone}
      padding={padding}
      className={[
        variant === "soft" ? classes.cardSoft : classes.card,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </MantineCard>
  );
}
