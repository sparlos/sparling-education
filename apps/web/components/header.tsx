"use client";

import { SiteHeader } from "@repo/ui/marketing/site-header";
import { usePathname } from "next/navigation";
import { site } from "../content/site";

export function Header() {
  const pathname = usePathname();
  return (
    <SiteHeader
      links={site.nav}
      cta={site.navCta}
      activeHref={pathname}
      skipLinkLabel="Skip to content"
      openMenuLabel="Open menu"
      menuTitle="Main"
    />
  );
}
