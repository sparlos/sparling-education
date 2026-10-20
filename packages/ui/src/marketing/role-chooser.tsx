import type { ReactNode } from "react";
import { SimpleGrid } from "../simple-grid";
import { RoleCard, type RoleCardProps } from "./role-card";
import { Section, SectionHeading } from "./section";

interface RoleChooserProps {
  title: ReactNode;
  lead?: ReactNode;
  roles: RoleCardProps[];
}

/** "I'm a teacher / parent / student" cards, right under the home hero. */
export function RoleChooser({ title, lead, roles }: RoleChooserProps) {
  return (
    <Section spacing="compact" surface="raised" aria-labelledby="role-chooser">
      <SectionHeading id="role-chooser" title={title} lead={lead} />
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl">
        {roles.map((role) => (
          <RoleCard key={role.href} {...role} />
        ))}
      </SimpleGrid>
    </Section>
  );
}
