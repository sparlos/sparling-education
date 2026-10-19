"use client";

import { Button as MantineButton } from "@mantine/core";
import type { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  className?: string;
  appName: string;
}

export const Button = ({ children, className, appName }: ButtonProps) => {
  return (
    <MantineButton
      className={className}
      onClick={() => alert(`Hello from your ${appName} app!`)}
    >
      {children}
    </MantineButton>
  );
};
