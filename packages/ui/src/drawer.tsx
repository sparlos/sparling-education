import { Drawer as MantineDrawer } from "@mantine/core";
import type { ReactNode } from "react";

interface DrawerProps {
  opened: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  id?: string;
}

export function Drawer({ opened, onClose, title, children, id }: DrawerProps) {
  return (
    <MantineDrawer
      opened={opened}
      onClose={onClose}
      title={title}
      position="right"
      id={id}
      size="xs"
      padding="lg"
      radius="lg"
      styles={{
        content: { backgroundColor: "var(--k-surface-page)" },
        header: { backgroundColor: "var(--k-surface-page)" },
      }}
    >
      {children}
    </MantineDrawer>
  );
}
