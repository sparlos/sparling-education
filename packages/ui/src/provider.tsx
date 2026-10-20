import "@mantine/core/styles.css";
import "./global.css";

import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import type { ReactNode } from "react";
import { ThemeProvider } from "./theme-provider";

export { fontVariables } from "./theme";

export const htmlProps = mantineHtmlProps;

// The site is light-only; pin the scheme so OS dark mode never applies.
export const UIHead = () => <ColorSchemeScript forceColorScheme="light" />;

export const UIProvider = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);
