"use client";

import { Accordion as MantineAccordion } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./accordion.module.css";

export interface AccordionItem {
  value: string;
  title: ReactNode;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
}

export function Accordion({ items, className }: AccordionProps) {
  return (
    <MantineAccordion
      variant="unstyled"
      chevronSize={20}
      className={className}
      classNames={classes}
    >
      {items.map((item) => (
        <MantineAccordion.Item key={item.value} value={item.value}>
          <MantineAccordion.Control>{item.title}</MantineAccordion.Control>
          <MantineAccordion.Panel>{item.content}</MantineAccordion.Panel>
        </MantineAccordion.Item>
      ))}
    </MantineAccordion>
  );
}
