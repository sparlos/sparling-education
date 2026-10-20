"use client";

// Client boundary: the CSS variables resolver is a function, which can't be
// passed from a server component.
import { MantineProvider } from "@mantine/core";
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { cssVariablesResolver, theme } from "./theme";

export const ThemeProvider = ({ children }: { children: ReactNode }) => (
  <MantineProvider
    theme={theme}
    cssVariablesResolver={cssVariablesResolver}
    forceColorScheme="light"
  >
    {/* Motion skips transform animations for visitors who ask for less motion. */}
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </MantineProvider>
);
