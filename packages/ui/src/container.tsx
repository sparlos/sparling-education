import { Container as MantineContainer } from "@mantine/core";
import type { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  /** `page` for full layouts, `prose` for readable text columns. */
  size?: "page" | "prose";
}

export function Container({ children, size = "page" }: ContainerProps) {
  return (
    <MantineContainer
      size={size === "prose" ? "var(--k-width-prose)" : undefined}
      px={{ base: "md", sm: "lg" }}
    >
      {children}
    </MantineContainer>
  );
}
