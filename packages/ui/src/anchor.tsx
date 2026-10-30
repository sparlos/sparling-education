import { Anchor as MantineAnchor } from "@mantine/core";
import type { ReactNode } from "react";

interface AnchorProps {
  children: ReactNode;
  href: string;
  className?: string;
  /** Opens in a new tab, for a page outside Kindling. */
  newTab?: boolean;
  /** Marks it for a walkthrough step to point at. */
  "data-walkthrough"?: string;
}

export function Anchor({
  children,
  href,
  className,
  newTab,
  "data-walkthrough": walkthrough,
}: AnchorProps) {
  return (
    <MantineAnchor
      href={href}
      {...(newTab && { target: "_blank", rel: "noopener noreferrer" })}
      c="var(--tone-text)"
      underline="hover"
      className={className}
      data-walkthrough={walkthrough}
    >
      {children}
    </MantineAnchor>
  );
}
