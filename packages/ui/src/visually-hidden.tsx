import { VisuallyHidden as MantineVisuallyHidden } from "@mantine/core";
import type { ReactNode } from "react";

/** Text for screen readers only. */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <MantineVisuallyHidden>{children}</MantineVisuallyHidden>;
}
