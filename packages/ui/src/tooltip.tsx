import { Tooltip as MantineTooltip } from "@mantine/core";
import type { ReactElement } from "react";

interface TooltipProps {
  /** The full text, for a child that shows only part of it. */
  label: string;
  children: ReactElement;
}

/** Text on hover or focus. Marks its child with the help cursor. */
export function Tooltip({ label, children }: TooltipProps) {
  return (
    <MantineTooltip
      label={label}
      multiline
      maw={320}
      withArrow
      events={{ hover: true, focus: true, touch: true }}
    >
      {children}
    </MantineTooltip>
  );
}
