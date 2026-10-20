import type { ReactNode } from "react";
import { Badge } from "../badge";
import { Button, type ButtonTone } from "../button";
import { Container } from "../container";
import { Title } from "../title";
import { Blob, DecorLayer, Ember, Sparkle } from "./decor";
import classes from "./hero.module.css";
import { ImageSlot } from "./image-slot";

export interface HeroAction {
  label: string;
  href: string;
}

interface HeroProps {
  title: ReactNode;
  lead: ReactNode;
  eyebrow?: ReactNode;
  primaryAction?: HeroAction;
  secondaryAction?: HeroAction;
  /** Small reassurance line under the actions. */
  note?: ReactNode;
  image: { alt: string; src?: string; placeholderLabel?: string };
  tone?: ButtonTone;
}

/** The page-opening band: big title, lead, actions and a product image. */
export function Hero({
  title,
  lead,
  eyebrow,
  primaryAction,
  secondaryAction,
  note,
  image,
  tone = "brand",
}: HeroProps) {
  return (
    <section className={classes.root} data-tone={tone}>
      <DecorLayer>
        <Blob size={420} right="-140px" top="-120px" opacity={0.9} />
        <Sparkle size={28} left="6%" top="14%" float hideOnMobile />
        <Sparkle
          size={18}
          right="44%"
          top="10%"
          color="tone"
          float
          hideOnMobile
        />
        <Ember
          size={16}
          left="44%"
          bottom="14%"
          opacity={0.6}
          float
          hideOnMobile
        />
      </DecorLayer>
      <Container>
        <div className={classes.grid}>
          <div className={classes.copy}>
            {eyebrow && <Badge tone={tone}>{eyebrow}</Badge>}
            <Title order={1} size="display">
              {title}
            </Title>
            <p className={classes.lead}>{lead}</p>
            {(primaryAction || secondaryAction) && (
              <div className={classes.actions}>
                {primaryAction && (
                  <Button href={primaryAction.href} tone={tone} size="lg">
                    {primaryAction.label}
                  </Button>
                )}
                {secondaryAction && (
                  <Button
                    href={secondaryAction.href}
                    variant="secondary"
                    size="lg"
                  >
                    {secondaryAction.label}
                  </Button>
                )}
              </div>
            )}
            {note && <p className={classes.note}>{note}</p>}
          </div>
          <div className={classes.media}>
            <ImageSlot {...image} tone={tone} ratio="4/3" shadow />
          </div>
        </div>
      </Container>
    </section>
  );
}

/** Emphasises a phrase inside a hero or section title. */
export function TitleHighlight({ children }: { children: ReactNode }) {
  return <span className={classes.highlight}>{children}</span>;
}
