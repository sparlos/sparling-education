import type { ReactNode } from "react";
import { Badge } from "../badge";
import { Button } from "../button";
import { Icon } from "../icon";
import type { LinkItem } from "../link-item";
import { SimpleGrid } from "../simple-grid";
import type { Tone } from "../tone";
import classes from "./pricing-tiers.module.css";
import { Reveal } from "./reveal";

export interface PricingTier {
  name: string;
  /** Free-form price line; pre-launch this is wording, not a number. */
  price: string;
  description: ReactNode;
  features: string[];
  cta: LinkItem;
  badge?: string;
  highlighted?: boolean;
  tone?: Tone;
}

interface PricingTiersProps {
  tiers: PricingTier[];
  footnote?: ReactNode;
}

export function PricingTiers({ tiers, footnote }: PricingTiersProps) {
  return (
    <>
      <SimpleGrid cols={{ base: 1, md: tiers.length }} spacing="xl">
        {tiers.map((tier, index) => (
          <Reveal key={tier.name} index={index} fill>
            <article
              className={classes.tier}
              data-tone={tier.tone ?? "brand"}
              data-highlighted={tier.highlighted || undefined}
            >
              {tier.badge && (
                <div>
                  <Badge tone={tier.tone}>{tier.badge}</Badge>
                </div>
              )}
              <h3 className={classes.name}>{tier.name}</h3>
              <p className={classes.price}>{tier.price}</p>
              <p className={classes.description}>{tier.description}</p>
              <ul className={classes.features}>
                {tier.features.map((feature) => (
                  <li key={feature} className={classes.feature}>
                    <span className={classes.check}>
                      <Icon name="check" size={16} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                href={tier.cta.href}
                tone={tier.tone}
                variant={tier.highlighted ? "primary" : "secondary"}
                fullWidth
              >
                {tier.cta.label}
              </Button>
            </article>
          </Reveal>
        ))}
      </SimpleGrid>
      {footnote && <p className={classes.footnote}>{footnote}</p>}
    </>
  );
}
