"use client";

// Client boundary: the CSS variables resolver is a function, which can't be
// passed from a server component.
import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";
import { cssVariablesResolver, theme } from "./theme";

export const ThemeProvider = ({ children }: { children: ReactNode }) => (
  <MantineProvider
    theme={theme}
    cssVariablesResolver={cssVariablesResolver}
    forceColorScheme="light"
  >
    {children}
  </MantineProvider>
);
