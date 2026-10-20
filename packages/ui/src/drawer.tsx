import { Drawer as MantineDrawer } from "@mantine/core";
import type { ReactNode } from "react";

interface DrawerProps {
  opened: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  position?: "left" | "right" | "top";
  id?: string;
}

export function Drawer({
  opened,
  onClose,
  title,
  children,
  position = "right",
  id,
}: DrawerProps) {
  return (
    <MantineDrawer
      opened={opened}
      onClose={onClose}
      title={title}
      position={position}
      id={id}
      size="xs"
      padding="lg"
      radius={position === "top" ? 0 : "lg"}
      styles={{
        content: { backgroundColor: "var(--k-surface-page)" },
        header: { backgroundColor: "var(--k-surface-page)" },
      }}
    >
      {children}
    </MantineDrawer>
  );
}
