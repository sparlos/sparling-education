"use client";

import { Table as MantineTable } from "@mantine/core";
import type { ReactNode } from "react";

interface TableProps {
  head: ReactNode[];
  /** Each row; its first cell is rendered as the row header. */
  body: { key: string; cells: ReactNode[] }[];
  caption?: ReactNode;
  className?: string;
  classNames?: Partial<
    Record<"table" | "thead" | "th" | "td" | "tr" | "caption", string>
  >;
}

export function Table({
  head,
  body,
  caption,
  className,
  classNames,
}: TableProps) {
  return (
    <MantineTable
      captionSide="top"
      verticalSpacing="md"
      horizontalSpacing="lg"
      className={className}
      classNames={classNames}
    >
      {caption && <MantineTable.Caption>{caption}</MantineTable.Caption>}
      <MantineTable.Thead>
        <MantineTable.Tr>
          {head.map((cell, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: columns are fixed
            <MantineTable.Th key={i} scope="col">
              {cell}
            </MantineTable.Th>
          ))}
        </MantineTable.Tr>
      </MantineTable.Thead>
      <MantineTable.Tbody>
        {body.map((row) => (
          <MantineTable.Tr key={row.key}>
            {row.cells.map((cell, i) =>
              i === 0 ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: columns are fixed
                <MantineTable.Th key={i} scope="row">
                  {cell}
                </MantineTable.Th>
              ) : (
                // biome-ignore lint/suspicious/noArrayIndexKey: columns are fixed
                <MantineTable.Td key={i}>{cell}</MantineTable.Td>
              ),
            )}
          </MantineTable.Tr>
        ))}
      </MantineTable.Tbody>
    </MantineTable>
  );
}
