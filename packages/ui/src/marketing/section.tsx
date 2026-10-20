import type { ReactNode } from "react";
import { Container } from "../container";
import { Title } from "../title";
import type { Tone } from "../tone";
import { Reveal } from "./reveal";
import classes from "./section.module.css";

interface SectionProps {
  children: ReactNode;
  /** `tone` tints the band with the section's audience colour. */
  surface?: "page" | "raised" | "sunken" | "tone" | "inverse";
  tone?: Tone;
  spacing?: "default" | "compact";
  /** Narrow the content to a readable text column. */
  prose?: boolean;
  id?: string;
  /** Decorative shapes rendered behind the content. */
  decoration?: ReactNode;
  /** Rendered above the content; its `id` labels the section. */
  heading?: SectionHeadingProps;
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
  heading,
}: SectionProps) {
  return (
    <section
      id={id}
      className={classes.root}
      data-surface={surface}
      data-tone={tone}
      data-spacing={spacing}
      aria-labelledby={heading?.id}
    >
      {decoration}
      <div className={classes.inner}>
        <Container size={prose ? "prose" : "page"}>
          {heading && <SectionHeading {...heading} />}
          {children}
        </Container>
      </div>
    </section>
  );
}

export interface SectionHeadingProps {
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
    <Reveal>
      <div className={classes.heading} data-align={align}>
        {eyebrow && <p className={classes.eyebrow}>{eyebrow}</p>}
        <Title
          order={order}
          size={order === 2 ? "h2" : "h3"}
          c="inherit"
          id={id}
        >
          {title}
        </Title>
        {lead && <p className={classes.lead}>{lead}</p>}
      </div>
    </Reveal>
  );
}
