// Literata with its optical-size axis, so big headings get the display cut
// and body text the text cut, from one family.
import "@fontsource-variable/literata/opsz.css";
import "@fontsource-variable/literata/opsz-italic.css";
// Only for the product's wordmark, which is set in the product's own face.
import "@fontsource/plus-jakarta-sans/800.css";
import "./globals.css";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { site } from "../content/site";
import { companyColourVariables } from "../identity";

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-CA" style={companyColourVariables as CSSProperties}>
      <body>{children}</body>
    </html>
  );
}
