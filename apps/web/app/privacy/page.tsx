import { Anchor } from "@repo/ui/anchor";
import { Section } from "@repo/ui/marketing/section";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import type { Metadata } from "next";
import { privacy } from "../../content/privacy";

export const metadata: Metadata = privacy.meta;

export default function PrivacyPage() {
  return (
    <Section prose>
      <Stack gap="xl">
        <Stack gap="md">
          <Title order={1} size="h1">
            {privacy.title}
          </Title>
          <Text size="lg" c="muted">
            {privacy.lead}
          </Text>
        </Stack>
        {privacy.sections.map((section) => (
          <Stack key={section.title} gap="xs">
            <Title order={2} size="h4">
              {section.title}
            </Title>
            <Text>{section.body}</Text>
          </Stack>
        ))}
        <Text>
          {privacy.contact} <Anchor href="/contact">Contact us</Anchor>.
        </Text>
      </Stack>
    </Section>
  );
}
