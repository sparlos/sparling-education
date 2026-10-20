import type { ReactNode } from "react";
import type { ButtonTone } from "../button";
import { Container } from "../container";
import { Title } from "../title";
import classes from "./section.module.css";

interface SectionProps {
  children: ReactNode;
  /** `tone` tints the band with the section's audience colour. */
  surface?: "page" | "raised" | "sunken" | "tone" | "inverse";
  tone?: ButtonTone;
  spacing?: "default" | "compact";
  /** Narrow the content to a readable text column. */
  prose?: boolean;
  id?: string;
  /** Decorative shapes rendered behind the content. */
  decoration?: ReactNode;
  "aria-labelledby"?: string;
}

/** A full-width page band with consistent vertical rhythm. */
export function Section({
  children,
  surface = "page",
  tone,
  spacing = "default",
  prose,
  id,
  decoration,
  "aria-labelledby": labelledBy,
}: SectionProps) {
  return (
    <section
      id={id}
      className={classes.root}
      data-surface={surface}
      data-tone={tone}
      data-spacing={spacing}
      aria-labelledby={labelledBy}
    >
      {decoration}
      <div className={classes.inner}>
        <Container size={prose ? "prose" : "page"}>{children}</Container>
      </div>
    </section>
  );
}

interface SectionHeadingProps {
  title: ReactNode;
  eyebrow?: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  /** Heading level; sections under a page hero are usually 2. */
  order?: 2 | 3;
  id?: string;
}

export function SectionHeading({
  title,
  eyebrow,
  lead,
  align = "center",
  order = 2,
  id,
}: SectionHeadingProps) {
  return (
    <div className={classes.heading} data-align={align}>
      {eyebrow && <p className={classes.eyebrow}>{eyebrow}</p>}
      <Title order={order} size={order === 2 ? "h2" : "h3"} c="inherit" id={id}>
        {title}
      </Title>
      {lead && <p className={classes.lead}>{lead}</p>}
    </div>
  );
}
