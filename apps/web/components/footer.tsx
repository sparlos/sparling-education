import { SiteFooter } from "@repo/ui/marketing/site-footer";
import { site } from "../content/site";

export function Footer() {
  return (
    <SiteFooter
      tagline={site.footer.tagline}
      columns={site.footer.columns}
      notes={site.footer.notes}
      copyright={`© ${new Date().getFullYear()} ${site.name}`}
    />
  );
}
