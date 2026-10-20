import { Anchor as MantineAnchor } from "@mantine/core";
import type { ReactNode } from "react";
import { type InkColor, inkVar } from "./ink";

interface AnchorProps {
  children: ReactNode;
  href: string;
  c?: InkColor;
  fw?: 400 | 600 | 700 | 800;
  underline?: "always" | "hover" | "never";
  "aria-current"?: "page";
  className?: string;
}

export function Anchor({
  children,
  href,
  c = "tone",
  fw,
  underline = "hover",
  "aria-current": ariaCurrent,
  className,
}: AnchorProps) {
  return (
    <MantineAnchor
      href={href}
      c={inkVar(c)}
      fw={fw}
      underline={underline}
      aria-current={ariaCurrent}
      className={className}
    >
      {children}
    </MantineAnchor>
  );
}
