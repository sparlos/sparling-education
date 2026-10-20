import { SimpleGrid as MantineSimpleGrid } from "@mantine/core";
import type { ReactNode } from "react";
import type { Space } from "./space";

interface SimpleGridProps {
  children: ReactNode;
  /** Columns per breakpoint, e.g. `{ base: 1, sm: 2, md: 3 }`. */
  cols:
    | number
    | { base: number; xs?: number; sm?: number; md?: number; lg?: number };
  spacing?: Space;
  verticalSpacing?: Space;
  className?: string;
}

export function SimpleGrid({
  children,
  cols,
  spacing = "lg",
  verticalSpacing,
  className,
}: SimpleGridProps) {
  return (
    <MantineSimpleGrid
      cols={cols}
      spacing={spacing}
      verticalSpacing={verticalSpacing}
      className={className}
    >
      {children}
    </MantineSimpleGrid>
  );
}
