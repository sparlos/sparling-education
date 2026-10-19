import { Card as MantineCard, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

export function Card({
  className,
  title,
  children,
  href,
}: {
  className?: string;
  title: string;
  children: ReactNode;
  href: string;
}) {
  return (
    <MantineCard
      component="a"
      className={className}
      href={`${href}?utm_source=create-turbo&utm_medium=basic&utm_campaign=create-turbo`}
      rel="noopener noreferrer"
      target="_blank"
      withBorder
      padding="md"
    >
      <Title order={2} size="h4">
        {title} <span>-&gt;</span>
      </Title>
      <Text>{children}</Text>
    </MantineCard>
  );
}
