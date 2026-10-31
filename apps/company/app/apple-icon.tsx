import { ImageResponse } from "next/og";
import { companyColour as c } from "../identity";
import { literata } from "../share/literata";

// app/icon.svg as a PNG, for home screens and the logo search engines show.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
// Drawn once at build time; the site is plain files with no server.
export const dynamic = "force-static";

export default async function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: c.ink,
        color: c.paper,
        fontFamily: "Literata",
        fontSize: 72,
        fontWeight: 500,
      }}
    >
      SE
      <div style={{ width: 68, height: 6, marginTop: 8, background: c.brass }} />
    </div>,
    { ...size, fonts: [await literata(500)] },
  );
}
