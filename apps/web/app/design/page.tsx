import {
  brandName,
  color,
  fontSize,
  headingSize,
  palette,
  type ToneTokens,
} from "@repo/tokens";
import { contrastRatio } from "@repo/tokens/color";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { CheckboxGroup } from "@repo/ui/checkbox-group";
import { Chevron } from "@repo/ui/chevron";
import { Container } from "@repo/ui/container";
import { Icon } from "@repo/ui/icon";
import { ComparisonTable } from "@repo/ui/marketing/comparison-table";
import { CtaBand } from "@repo/ui/marketing/cta-band";
import { Glint, Sparkle, Wing } from "@repo/ui/marketing/decor";
import { EmailCapture } from "@repo/ui/marketing/email-capture";
import { Faq } from "@repo/ui/marketing/faq";
import { FeatureGrid, PillarRow } from "@repo/ui/marketing/feature-grid";
import { Hero } from "@repo/ui/marketing/hero";
import { ImageSlot } from "@repo/ui/marketing/image-slot";
import { PilotSignupForm } from "@repo/ui/marketing/pilot-signup-form";
import { PricingTiers } from "@repo/ui/marketing/pricing-tiers";
import { PromiseBand } from "@repo/ui/marketing/promise-band";
import { RoleChooser } from "@repo/ui/marketing/role-chooser";
import { Section } from "@repo/ui/marketing/section";
import { Steps } from "@repo/ui/marketing/steps";
import { Wordmark } from "@repo/ui/marketing/wordmark";
import { SimpleGrid } from "@repo/ui/simple-grid";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { ThemeIcon } from "@repo/ui/theme-icon";
import { Title } from "@repo/ui/title";
import { tones } from "@repo/ui/tone";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PilotCta } from "../../components/pilot-cta";
import { educators } from "../../content/educators";
import { home } from "../../content/home";
import { parents } from "../../content/parents";
import {
  classroomSteps,
  comparison,
  comparisonFull,
  pilotForm,
  promiseItems,
} from "../../content/shared";
import { demoSubmit } from "./actions";
import classes from "./design.module.css";

export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

const toneTokens: Record<string, ToneTokens> = {
  brand: color.brand,
  // Outside a class colour scope, as here, the accent is the brand's.
  accent: color.brand,
  neutral: color.neutral,
  ...color.audience,
  ...color.meaning,
};

function ratio(fg: string, bg: string) {
  return `${contrastRatio(fg, bg).toFixed(1)}:1`;
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={classes.block}>
      <h2 className={classes.blockTitle}>{title}</h2>
      {children}
    </div>
  );
}

export default function DesignPage() {
  return (
    <>
      <Container>
        <Block title={`${brandName} design system`}>
          <Wordmark size="lg" />
          <Text c="muted">
            Tokens live in @repo/tokens, components in @repo/ui. Contrast ratios
            below are computed live from the tokens. This page is hidden from
            navigation and search engines.
          </Text>
        </Block>

        <Block title="Palette (ratios vs white / ink)">
          {Object.entries(palette).map(([name, scale]) => (
            <div key={name} className={classes.scale}>
              <span className={classes.scaleName}>{name}</span>
              {scale.map((hex, i) => {
                const onDark =
                  contrastRatio("#FFFFFF", hex) >
                  contrastRatio(color.ink.default, hex);
                return (
                  <div
                    key={hex}
                    className={classes.swatch}
                    style={{
                      backgroundColor: hex,
                      color: onDark ? "#FFFFFF" : color.ink.default,
                    }}
                  >
                    <strong>{i}</strong>
                    <span>{hex}</span>
                    <span>
                      {ratio("#FFFFFF", hex)} / {ratio(color.ink.default, hex)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </Block>

        <Block title="Tones">
          <div className={classes.tones}>
            {Object.entries(toneTokens).map(([name, tone]) => (
              <div key={name} className={classes.tone}>
                <div
                  className={classes.toneFill}
                  style={{ backgroundColor: tone.fill, color: tone.onFill }}
                >
                  {name} · {ratio(tone.onFill, tone.fill)}
                </div>
                {(["fillHover", "edge", "soft", "text"] as const).map((key) => (
                  <div key={key} className={classes.toneRow}>
                    <span>
                      <span
                        className={classes.chip}
                        style={{ backgroundColor: tone[key] }}
                      />
                      {key}
                    </span>
                    <span className={classes.meta}>
                      {tone[key]}
                      {key === "text" &&
                        ` · ${ratio(tone.text, color.surface.page)} on page`}
                      {key === "edge" &&
                        ` · ${ratio(tone.edge, color.surface.page)} on page`}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Block>

        <Block title="Typography">
          <div className={classes.typeRow}>
            <span className={classes.meta}>
              display {headingSize.display.min}–{headingSize.display.max}px
            </span>
            <Title order={2} size="display">
              Where the skill is how you win
            </Title>
          </div>
          {(["h1", "h2", "h3", "h4", "h5", "h6"] as const).map((h) => {
            const size = headingSize[h];
            return (
              <div key={h} className={classes.typeRow}>
                <span className={classes.meta}>
                  {h} {"min" in size ? `${size.min}–` : ""}
                  {size.max}px
                </span>
                <Title order={3} size={h}>
                  Build a bridge with fractions
                </Title>
              </div>
            );
          })}
          {(Object.keys(fontSize) as (keyof typeof fontSize)[]).map((s) => (
            <div key={s} className={classes.typeRow}>
              <span className={classes.meta}>
                {s} {fontSize[s]}px
              </span>
              <Text size={s}>
                Students get better at the game by getting better at the
                concept.
              </Text>
            </div>
          ))}
        </Block>

        <Block title="Buttons">
          {tones.map((tone) => (
            <div key={tone} className={classes.row} data-tone={tone}>
              <Button tone={tone}>Primary {tone}</Button>
              <Button tone={tone} size="lg">
                Large
              </Button>
              <Button
                tone={tone}
                leftSection={<Icon name="sparkles" size={20} />}
              >
                With icon
              </Button>
              <Button
                tone={tone}
                variant="subtle"
                rightSection={<Icon name="arrow-right" size={18} />}
              >
                Subtle
              </Button>
              <Button tone={tone} disabled>
                Disabled
              </Button>
            </div>
          ))}
          <div className={classes.row}>
            <Button variant="secondary">Secondary</Button>
            <Button variant="secondary" size="lg">
              Secondary large
            </Button>
          </div>
          <div className={classes.row}>
            <Button variant="secondary" rightSection={<Chevron open={false} />}>
              Shows content (closed)
            </Button>
            <Button variant="secondary" rightSection={<Chevron open />}>
              Hides content (open)
            </Button>
          </div>
        </Block>

        <Block title="Badges, icons, cards">
          <div className={classes.row}>
            {tones.map((tone) => (
              <Badge key={tone} tone={tone}>
                {tone}
              </Badge>
            ))}
          </div>
          <div className={classes.row}>
            {tones.map((tone) => (
              <ThemeIcon key={tone} tone={tone}>
                <Icon name="star" size={28} />
              </ThemeIcon>
            ))}
            {tones.map((tone) => (
              <ThemeIcon key={tone} tone={tone} variant="filled">
                <Icon name="star" size={28} />
              </ThemeIcon>
            ))}
          </div>
          <SimpleGrid cols={{ base: 1, md: 3 }}>
            <Card>
              <Stack gap="xs">
                <Title order={3} size="h4">
                  Raised card
                </Title>
                <Text c="muted">Static content cards stay flat.</Text>
              </Stack>
            </Card>
            <Card variant="soft" tone="educator">
              <Stack gap="xs">
                <Title order={3} size="h4">
                  Soft educator card
                </Title>
                <Text c="muted">Tinted with the audience tone.</Text>
              </Stack>
            </Card>
            <Card variant="soft" tone="parent">
              <Stack gap="xs">
                <Title order={3} size="h4">
                  Soft parent card
                </Title>
                <Text c="muted">Tinted with the audience tone.</Text>
              </Stack>
            </Card>
          </SimpleGrid>
        </Block>

        <Block title="Image slots and decoration">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
            {tones.map((tone, i) => (
              <ImageSlot
                key={tone}
                tone={tone}
                ratio={(["16/10", "4/3", "1/1", "4/5"] as const)[i]}
                alt={`Placeholder in the ${tone} tone`}
                placeholderLabel={`${tone} placeholder`}
              />
            ))}
          </SimpleGrid>
          <div className={classes.row} style={{ position: "relative" }}>
            <span style={{ position: "relative", width: 120, height: 120 }}>
              <Wing size={120} color="brand" opacity={0.6} />
            </span>
            <span style={{ position: "relative", width: 40, height: 40 }}>
              <Sparkle size={40} />
            </span>
            <span style={{ position: "relative", width: 32, height: 32 }}>
              <Glint size={32} />
            </span>
          </div>
        </Block>

        <Block title="Forms">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            <PilotSignupForm action={demoSubmit} {...pilotForm} />
            <EmailCapture
              action={demoSubmit}
              label="Your email"
              placeholder="you@example.com"
              submitLabel="Get updates"
              pendingLabel="Sending…"
              fineprint="Unsubscribe any time."
              tone="parent"
            />
            <CheckboxGroup
              label="Grades"
              name="grades"
              defaultValue={["4"]}
              options={[3, 4, 5].map((grade) => ({
                value: String(grade),
                label: `Grade ${grade}`,
              }))}
            />
          </SimpleGrid>
        </Block>
      </Container>

      <Hero {...home.hero} />
      <Hero {...parents.hero} tone="parent" />
      <RoleChooser {...home.roles} />
      <Section heading={{ id: "d-pillars", ...home.pillars }}>
        <PillarRow pillars={home.pillars.pillars} />
      </Section>
      <Section
        surface="sunken"
        heading={{ id: "d-features", ...educators.features }}
      >
        <FeatureGrid features={educators.features.items} tone="educator" />
      </Section>
      <Section heading={{ id: "d-steps", ...home.howItWorks }}>
        <Steps steps={classroomSteps} />
      </Section>
      <Section
        surface="sunken"
        heading={{ id: "d-compare", ...home.comparison }}
      >
        <ComparisonTable rows={comparisonFull} {...comparison.labels} />
      </Section>
      <Section
        surface="tone"
        tone="educator"
        heading={{ id: "d-pricing", ...educators.pricing }}
      >
        <PricingTiers
          tiers={educators.pricing.tiers}
          footnote={educators.pricing.footnote}
        />
      </Section>
      <Section spacing="compact">
        <PromiseBand {...home.promise} items={promiseItems} />
      </Section>
      <Section prose heading={{ id: "d-faq", title: educators.faq.title }}>
        <Faq items={educators.faq.items} />
      </Section>
      <Section>
        <Stack gap="xl">
          <PilotCta action={demoSubmit} />
          <CtaBand tone="parent" layout="stacked" title="Stacked CTA band">
            <Button tone="parent" size="lg">
              Student action
            </Button>
          </CtaBand>
        </Stack>
      </Section>
    </>
  );
}
