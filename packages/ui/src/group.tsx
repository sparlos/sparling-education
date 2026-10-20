import { Group as MantineGroup } from "@mantine/core";
import type { ReactNode } from "react";

type Space = "xs" | "sm" | "md" | "lg" | "xl" | 0;

interface GroupProps {
  children: ReactNode;
  gap?: Space;
  justify?: "flex-start" | "center" | "flex-end" | "space-between";
  align?: "flex-start" | "center" | "flex-end" | "baseline";
  wrap?: "wrap" | "nowrap";
  className?: string;
}

export function Group({
  children,
  gap = "md",
  justify,
  align,
  wrap = "wrap",
  className,
}: GroupProps) {
  return (
    <MantineGroup
      gap={gap}
      justify={justify}
      align={align}
      wrap={wrap}
      className={className}
    >
      {children}
    </MantineGroup>
  );
}
