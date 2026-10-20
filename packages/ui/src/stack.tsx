import { Stack as MantineStack } from "@mantine/core";
import type { ReactNode } from "react";
import type { Space } from "./space";

interface StackProps {
  children: ReactNode;
  gap?: Space | 0;
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
