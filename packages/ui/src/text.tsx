import { Text as MantineText } from "@mantine/core";
import type { ReactNode } from "react";
import { type InkColor, inkVar } from "./ink";

interface TextProps {
  children: ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  fw?: 400 | 600 | 700 | 800;
  c?: InkColor;
  ta?: "left" | "center";
  component?: "p" | "span" | "div";
  /** Use the rounded heading face, e.g. for eyebrows and labels. */
  heading?: boolean;
  className?: string;
}

export function Text({
  children,
  size = "md",
  fw,
  c,
  ta,
  component = "p",
  heading,
  className,
}: TextProps) {
  return (
    <MantineText
      component={component}
      size={size}
      fw={fw}
      c={inkVar(c)}
      ta={ta}
      ff={heading ? "var(--k-font-heading-stack)" : undefined}
      className={className}
    >
      {children}
    </MantineText>
  );
}
