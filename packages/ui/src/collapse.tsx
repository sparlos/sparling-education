"use client";

import { Collapse as MantineCollapse } from "@mantine/core";
import { motion } from "@repo/tokens";
import type { ReactNode } from "react";

interface CollapseProps {
  /** Whether the content is showing. It slides open and shut between. */
  open: boolean;
  children: ReactNode;
  id?: string;
  className?: string;
}

/**
 * Content a `DisclosureButton` (or a toggle with a `Chevron`) shows and
 * hides. It's gone from the page, and from screen readers, while shut.
 */
export function Collapse({ open, children, id, className }: CollapseProps) {
  return (
    <MantineCollapse
      expanded={open}
      keepMounted={false}
      transitionDuration={motion.duration.slow}
      transitionTimingFunction={motion.easing.standard}
      id={id}
      className={className}
    >
      {children}
    </MantineCollapse>
  );
}
