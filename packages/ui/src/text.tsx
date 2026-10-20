import { Text as MantineText } from "@mantine/core";
import type { ReactNode } from "react";
import { type InkColor, inkVar } from "./ink";

interface TextProps {
  children: ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  c?: InkColor;
  className?: string;
}

export function Text({ children, size = "md", c, className }: TextProps) {
  return (
    <MantineText component="p" size={size} c={inkVar(c)} className={className}>
      {children}
    </MantineText>
  );
}
