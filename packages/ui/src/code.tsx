import { Code as MantineCode } from "@mantine/core";
import type { ReactNode } from "react";

export function Code({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <MantineCode className={className}>{children}</MantineCode>;
}
