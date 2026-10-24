"use client";

import { Tabs as MantineTabs } from "@mantine/core";
import type { ReactNode } from "react";

export interface TabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  /** The tab open at first; the first item if omitted. */
  defaultValue?: string;
  className?: string;
}

export function Tabs({ items, defaultValue, className }: TabsProps) {
  return (
    <MantineTabs
      defaultValue={defaultValue ?? items[0]?.value}
      keepMounted={false}
      className={className}
    >
      <MantineTabs.List mb="lg">
        {items.map((item) => (
          <MantineTabs.Tab key={item.value} value={item.value} fz="md">
            {item.label}
          </MantineTabs.Tab>
        ))}
      </MantineTabs.List>
      {items.map((item) => (
        <MantineTabs.Panel key={item.value} value={item.value}>
          {item.content}
        </MantineTabs.Panel>
      ))}
    </MantineTabs>
  );
}
