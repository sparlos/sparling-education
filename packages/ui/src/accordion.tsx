"use client";

import { Accordion as MantineAccordion } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./accordion.module.css";

export interface AccordionItem {
  value: string;
  title: ReactNode;
  content: ReactNode;
  /**
   * Over the title's top-left corner, outside its button, e.g. a link. The
   * title keeps a same-sized copy there, so the overlay lines up with it.
   */
  overlay?: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
  /** "cards" (the default) for FAQs; "list" for rows inside a page's text. */
  variant?: "cards" | "list";
  /** The open item, when the page holds it (e.g. in the URL). */
  value?: string | null;
  onChange?(value: string | null): void;
}

export function Accordion({
  items,
  className,
  variant = "cards",
  value,
  onChange,
}: AccordionProps) {
  return (
    <MantineAccordion
      variant="unstyled"
      chevronSize={20}
      className={className}
      classNames={classes}
      mod={{ list: variant === "list" }}
      value={value}
      onChange={onChange}
    >
      {items.map((item) => (
        <MantineAccordion.Item key={item.value} value={item.value}>
          {item.overlay && (
            <div className={classes.overlay}>{item.overlay}</div>
          )}
          <MantineAccordion.Control>{item.title}</MantineAccordion.Control>
          <MantineAccordion.Panel>{item.content}</MantineAccordion.Panel>
        </MantineAccordion.Item>
      ))}
    </MantineAccordion>
  );
}
