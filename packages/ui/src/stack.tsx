import { Stack as MantineStack } from "@mantine/core";
import type { ReactNode } from "react";

type Space = "xs" | "sm" | "md" | "lg" | "xl" | 0;

interface StackProps {
  children: ReactNode;
  gap?: Space;
  align?: "stretch" | "flex-start" | "center" | "flex-end";
  className?: string;
}

export function Stack({ children, gap = "md", align, className }: StackProps) {
  return (
    <MantineStack gap={gap} align={align} className={className}>
      {children}
    </MantineStack>
  );
}
