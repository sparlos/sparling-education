import { htmlProps, UIHead, UIProvider } from "@repo/ui/provider";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Footer } from "../components/footer";
import { Header } from "../components/header";
import { site } from "../content/site";

// Self-hosted at build time, so visitors' browsers never contact Google.
// Variable names must match `fontVariables` in @repo/ui/provider.
// One family for headings and body, as in the apps.
const heading = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "700", "800"],
  variable: "--k-font-heading",
  display: "swap",
});
const body = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "700", "800"],
  variable: "--k-font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: site.title, template: `%s · ${site.name}` },
  description: site.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-CA" {...htmlProps}>
      <head>
        <UIHead />
      </head>
      <body className={`${heading.variable} ${body.variable}`}>
        <UIProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </UIProvider>
      </body>
    </html>
  );
}
