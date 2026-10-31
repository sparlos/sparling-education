// Literata with its optical-size axis, so big headings get the display cut
// and body text the text cut, from one family.
import "@fontsource-variable/literata/opsz.css";
import "@fontsource-variable/literata/opsz-italic.css";
// Only for the product's wordmark, which is set in the product's own face.
import "@fontsource/plus-jakarta-sans/800.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import {
  companyName,
  contactEmail,
  productSiteUrl,
  site,
  siteUrl,
} from "../content/site";
import { companyColour, companyColourVariables } from "../identity";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: site.title,
  description: site.description,
  applicationName: companyName,
  authors: [{ name: companyName, url: siteUrl }],
  alternates: { canonical: "/" },
  // The share picture is app/opengraph-image.tsx, which Next.js adds here.
  openGraph: {
    type: "website",
    url: "/",
    siteName: companyName,
    title: site.title,
    description: site.description,
    locale: "en_CA",
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
};

export const viewport: Viewport = {
  themeColor: companyColour.paper,
};

// Tells search engines who the company is, for the panel beside results.
const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: companyName,
  url: siteUrl,
  logo: `${siteUrl}/apple-icon.png`,
  email: contactEmail,
  description: site.description,
  areaServed: "CA",
  sameAs: [productSiteUrl],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-CA" style={companyColourVariables as CSSProperties}>
      <body>
        {children}
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: our own constant, escaped below
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organization).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
