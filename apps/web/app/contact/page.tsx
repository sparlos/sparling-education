import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Icon } from "@repo/ui/icon";
import { Section } from "@repo/ui/marketing/section";
import { SimpleGrid } from "@repo/ui/simple-grid";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { ThemeIcon } from "@repo/ui/theme-icon";
import { Title } from "@repo/ui/title";
import type { Metadata } from "next";
import { contact } from "../../content/contact";
import { contactEmail } from "../../content/site";

export const metadata: Metadata = contact.meta;

export default function ContactPage() {
  return (
    <Section>
      <Stack gap="xl">
        <Stack gap="md" align="flex-start">
          <Title order={1} size="h1">
            {contact.title}
          </Title>
          <Text size="lg" c="muted">
            {contact.lead}
          </Text>
          <Button
            href={`mailto:${contactEmail}`}
            size="lg"
            leftSection={<Icon name="mail" />}
          >
            {contact.emailLabel}: {contactEmail}
          </Button>
        </Stack>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
          {contact.options.map((option) => (
            <Card key={option.title} variant="soft" tone={option.tone}>
              <Stack gap="sm" align="flex-start">
                <ThemeIcon tone={option.tone} variant="filled">
                  <Icon name={option.icon} size={28} />
                </ThemeIcon>
                <Title order={2} size="h4">
                  {option.title}
                </Title>
                <Text c="muted">{option.body}</Text>
                {option.action && (
                  <Button
                    href={option.action.href}
                    variant="subtle"
                    tone={option.tone}
                    rightSection={<Icon name="arrow-right" size={18} />}
                  >
                    {option.action.label}
                  </Button>
                )}
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </Section>
  );
}
