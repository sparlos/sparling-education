import { Anchor as MantineAnchor } from "@mantine/core";
import type { ReactNode } from "react";

interface AnchorProps {
  children: ReactNode;
  href: string;
  className?: string;
}

export function Anchor({ children, href, className }: AnchorProps) {
  return (
    <MantineAnchor
      href={href}
      c="var(--tone-text)"
      underline="hover"
      className={className}
    >
      {children}
    </MantineAnchor>
  );
}
