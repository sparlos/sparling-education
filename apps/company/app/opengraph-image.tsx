import { ImageResponse } from "next/og";
import { companyName, site } from "../content/site";
import { companyColour as c } from "../identity";
import { literata } from "../share/literata";

// The picture social media and chat apps show for a link to the site, drawn
// at build time like a title page: the monogram, the headline, a brass rule.

export const alt = site.shareImage.alt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 88px",
        background: c.paper,
        color: c.ink,
        fontFamily: "Literata",
        borderBottom: `16px solid ${c.ink}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div
          style={{
            width: 80,
            height: 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: c.ink,
            color: c.paper,
            fontSize: 32,
            fontWeight: 500,
          }}
        >
          SE
          <div
            style={{ width: 30, height: 3, marginTop: 4, background: c.brass }}
          />
        </div>
        <div style={{ fontSize: 34, fontWeight: 500 }}>{companyName}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <div
          style={{
            fontSize: 68,
            fontWeight: 600,
            lineHeight: 1.12,
            letterSpacing: -1,
            maxWidth: 960,
          }}
        >
          {site.hero.title}
        </div>
        <div style={{ width: 120, height: 4, background: c.brass }} />
        <div style={{ fontSize: 32, color: c.inkSoft }}>
          {site.shareImage.tagline}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: await Promise.all([literata(500), literata(600)]),
    },
  );
}
