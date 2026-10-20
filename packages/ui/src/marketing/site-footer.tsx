import type { CSSProperties, ReactNode } from "react";
import { Container } from "../container";
import type { LinkItem } from "../link-item";
import classes from "./site-footer.module.css";
import { Wordmark } from "./wordmark";

interface FooterColumn {
  title: string;
  links: LinkItem[];
}

interface SiteFooterProps {
  tagline: ReactNode;
  columns: FooterColumn[];
  /** Short facts in the bottom bar, e.g. "Made in Ontario". */
  notes: ReactNode[];
  copyright: ReactNode;
}

export function SiteFooter({
  tagline,
  columns,
  notes,
  copyright,
}: SiteFooterProps) {
  return (
    <footer className={classes.root}>
      <Container>
        <div
          className={classes.top}
          style={{ "--footer-columns": columns.length } as CSSProperties}
        >
          <div className={classes.brand}>
            <Wordmark href="/" inverse />
            <p className={classes.tagline}>{tagline}</p>
          </div>
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className={classes.columnTitle}>{column.title}</p>
              <ul className={classes.columnLinks}>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className={classes.link}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className={classes.bottom}>
          <p>{copyright}</p>
          <ul className={classes.notes}>
            {notes.map((note, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static list
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
