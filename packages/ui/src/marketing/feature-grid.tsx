import type { ReactNode } from "react";
import { Card } from "../card";
import { Icon, type IconName } from "../icon";
import { SimpleGrid } from "../simple-grid";
import { ThemeIcon } from "../theme-icon";
import type { Tone } from "../tone";
import classes from "./feature-grid.module.css";
import { ImageSlot, type ImageSlotImage } from "./image-slot";
import { Reveal, RevealPop } from "./reveal";

export interface Feature {
  icon: IconName;
  title: string;
  body: ReactNode;
}

interface FeatureGridProps {
  features: Feature[];
  columns?: 2 | 3;
  tone?: Tone;
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
      {features.map((feature, index) => (
        <Reveal key={feature.title} index={index} className={classes.item}>
          <RevealPop className={classes.icon}>
            <ThemeIcon tone={tone}>
              <Icon name={feature.icon} size={28} />
            </ThemeIcon>
          </RevealPop>
          <h3 className={classes.title}>{feature.title}</h3>
          <p className={classes.body}>{feature.body}</p>
        </Reveal>
      ))}
    </SimpleGrid>
  );
}

export interface PillarProps {
  title: string;
  body: ReactNode;
  image: ImageSlotImage;
  tone?: Tone;
}

/** One of the big product ideas, shown as a card with an image. */
export function Pillar({ title, body, image, tone = "brand" }: PillarProps) {
  return (
    <Card tone={tone} padding="lg" className={classes.pillarCard}>
      <div className={classes.pillar}>
        <ImageSlot {...image} tone={tone} ratio="4/3" />
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
      {pillars.map((pillar, index) => (
        <Reveal key={pillar.title} index={index} fill>
          <Pillar {...pillar} />
        </Reveal>
      ))}
    </SimpleGrid>
  );
}
