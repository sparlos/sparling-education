import "@mantine/core/styles.css";

import {
  ColorSchemeScript,
  createTheme,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import type { ReactNode } from "react";

const theme = createTheme({});

export const htmlProps = mantineHtmlProps;

export const UIHead = () => <ColorSchemeScript />;

export const UIProvider = ({ children }: { children: ReactNode }) => (
  <MantineProvider theme={theme}>{children}</MantineProvider>
);
