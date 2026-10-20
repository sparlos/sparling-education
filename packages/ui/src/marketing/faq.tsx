import type { ReactNode } from "react";
import { Accordion } from "../accordion";

export interface FaqItem {
  question: string;
  answer: ReactNode;
}

/** Frequently asked questions as an accordion. */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <Accordion
      items={items.map((item) => ({
        value: item.question,
        title: item.question,
        content: item.answer,
      }))}
    />
  );
}
