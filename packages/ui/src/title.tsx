import { Title as MantineTitle } from "@mantine/core";
import type { ReactNode } from "react";
import { type InkColor, inkVar } from "./ink";

interface TitleProps {
  children: ReactNode;
  order?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Visual size, independent of `order`. `display` is the hero size. */
  size?: "display" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  c?: InkColor;
  ta?: "left" | "center";
  id?: string;
  className?: string;
}

export function Title({
  children,
  order = 2,
  size,
  c = "ink",
  ta,
  id,
  className,
}: TitleProps) {
  const display = size === "display";
  return (
    <MantineTitle
      order={order}
      size={display ? undefined : size}
      c={inkVar(c)}
      ta={ta}
      id={id}
      className={className}
      style={
        display
          ? {
              fontSize: "var(--k-font-size-display)",
              lineHeight: "var(--k-line-height-display)",
              letterSpacing: "-0.015em",
            }
          : undefined
      }
    >
      {children}
    </MantineTitle>
  );
}
