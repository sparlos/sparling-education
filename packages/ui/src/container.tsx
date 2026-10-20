import { Container as MantineContainer } from "@mantine/core";
import type { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  /** `page` for full layouts, `prose` for readable text columns. */
  size?: "page" | "prose";
  className?: string;
}

export function Container({
  children,
  size = "page",
  className,
}: ContainerProps) {
  return (
    <MantineContainer
      size={size === "prose" ? "var(--k-width-prose)" : undefined}
      px={{ base: "md", sm: "lg" }}
      className={className}
    >
      {children}
    </MantineContainer>
  );
}
