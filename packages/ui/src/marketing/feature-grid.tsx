import type { Audience } from "@repo/tokens";
import type { ReactNode } from "react";
import type { ButtonTone } from "../button";
import { Card } from "../card";
import { Icon, type IconName } from "../icon";
import { SimpleGrid } from "../simple-grid";
import { ThemeIcon } from "../theme-icon";
import classes from "./feature-grid.module.css";
import { ImageSlot } from "./image-slot";

export interface Feature {
  icon: IconName;
  title: string;
  body: ReactNode;
}

interface FeatureGridProps {
  features: Feature[];
  columns?: 2 | 3;
  tone?: ButtonTone;
}

/** A grid of Kindling features, each with an icon, title and short body. */
export function FeatureGrid({
  features,
  columns = 3,
  tone = "brand",
}: FeatureGridProps) {
  return (
    <SimpleGrid
      cols={{ base: 1, sm: 2, md: columns }}
      spacing="xl"
      verticalSpacing="xl"
    >
      {features.map((feature) => (
        <div key={feature.title} className={classes.item}>
          <ThemeIcon tone={tone}>
            <Icon name={feature.icon} size={28} />
          </ThemeIcon>
          <h3 className={classes.title}>{feature.title}</h3>
          <p className={classes.body}>{feature.body}</p>
        </div>
      ))}
    </SimpleGrid>
  );
}

export interface PillarProps {
  title: string;
  body: ReactNode;
  image: { alt: string; src?: string; placeholderLabel?: string };
  tone?: Audience | "brand";
  /** Small label above the title, e.g. "01". */
  label?: string;
}

/** One of the big product ideas, shown as a card with an image. */
export function Pillar({
  title,
  body,
  image,
  tone = "brand",
  label,
}: PillarProps) {
  return (
    <Card tone={tone} padding="lg">
      <div className={classes.pillar} data-tone={tone}>
        <ImageSlot {...image} tone={tone} ratio="4/3" />
        {label && <span className={classes.pillarNumber}>{label}</span>}
        <h3 className={classes.pillarTitle}>{title}</h3>
        <p className={classes.body}>{body}</p>
      </div>
    </Card>
  );
}

/** Lays out Pillars in a responsive row. */
export function PillarRow({ pillars }: { pillars: PillarProps[] }) {
  return (
    <SimpleGrid
      cols={{ base: 1, md: pillars.length >= 3 ? 3 : 2 }}
      spacing="xl"
    >
      {pillars.map((pillar) => (
        <Pillar key={pillar.title} {...pillar} />
      ))}
    </SimpleGrid>
  );
}
