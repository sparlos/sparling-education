import { Anchor as MantineAnchor } from "@mantine/core";
import type { ReactNode } from "react";

interface AnchorProps {
  children: ReactNode;
  href: string;
  className?: string;
  /** Opens in a new tab, for a page outside Kindling. */
  newTab?: boolean;
}

export function Anchor({ children, href, className, newTab }: AnchorProps) {
  return (
    <MantineAnchor
      href={href}
      {...(newTab && { target: "_blank", rel: "noopener noreferrer" })}
      c="var(--tone-text)"
      underline="hover"
      className={className}
    >
      {children}
    </MantineAnchor>
  );
}
