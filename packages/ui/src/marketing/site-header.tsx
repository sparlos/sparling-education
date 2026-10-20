"use client";

import { useDisclosure } from "@mantine/hooks";
import type { Audience } from "@repo/tokens";
import { Burger } from "../burger";
import { Button } from "../button";
import { Container } from "../container";
import { Drawer } from "../drawer";
import classes from "./site-header.module.css";
import { Wordmark } from "./wordmark";

export interface NavLink {
  label: string;
  href: string;
  tone?: Audience;
}

interface SiteHeaderProps {
  links: NavLink[];
  cta: { label: string; href: string };
  /** The current path, to mark the active link. */
  activeHref?: string;
  skipLinkLabel: string;
  openMenuLabel: string;
  menuTitle: string;
}

export function SiteHeader({
  links,
  cta,
  activeHref,
  skipLinkLabel,
  openMenuLabel,
  menuTitle,
}: SiteHeaderProps) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const current = (href: string) =>
    href === activeHref ? ("page" as const) : undefined;

  return (
    <header className={classes.root}>
      <a href="#main" className={classes.skip}>
        {skipLinkLabel}
      </a>
      <Container>
        <div className={classes.bar}>
          <Wordmark href="/" />
          <nav className={classes.desktop} aria-label={menuTitle}>
            <ul className={classes.links}>
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className={classes.link}
                    data-tone={link.tone}
                    aria-current={current(link.href)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <Button href={cta.href}>{cta.label}</Button>
          </nav>
          <div className={classes.mobile}>
            <Burger
              opened={opened}
              onClick={toggle}
              aria-label={openMenuLabel}
              aria-controls="site-menu"
            />
          </div>
        </div>
      </Container>
      <Drawer
        opened={opened}
        onClose={close}
        title={<Wordmark />}
        id="site-menu"
      >
        <nav aria-label={menuTitle}>
          <ul className={classes.drawerLinks}>
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={classes.drawerLink}
                  data-tone={link.tone}
                  aria-current={current(link.href)}
                  onClick={close}
                >
                  <span className={classes.dot} aria-hidden="true" />
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <Button href={cta.href} size="lg" fullWidth>
            {cta.label}
          </Button>
        </nav>
      </Drawer>
    </header>
  );
}
