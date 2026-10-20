import "@mantine/core/styles.css";
import "./global.css";

import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import type { ReactNode } from "react";
import { ThemeProvider } from "./theme-provider";

export { fontVariables } from "./theme";

export const htmlProps = mantineHtmlProps;

// The site is light-only; pin the scheme so OS dark mode never applies.
// Scroll-in content (`marketing/reveal`) is server-rendered hidden; without
// JavaScript it would never appear, so show it outright.
export const UIHead = () => (
  <>
    <ColorSchemeScript forceColorScheme="light" />
    <noscript>
      <style>
        {"[data-reveal]{opacity:1!important;transform:none!important}"}
      </style>
    </noscript>
  </>
);

export const UIProvider = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);
