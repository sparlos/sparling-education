import type { ReactNode } from "react";
import { SimpleGrid } from "../simple-grid";
import { Reveal } from "./reveal";
import { RoleCard, type RoleCardProps } from "./role-card";
import { Section } from "./section";

interface RoleChooserProps {
  title: ReactNode;
  lead?: ReactNode;
  roles: RoleCardProps[];
}

/** "I'm a teacher / parent / student" cards, right under the home hero. */
export function RoleChooser({ title, lead, roles }: RoleChooserProps) {
  return (
    <Section
      spacing="compact"
      surface="raised"
      heading={{ id: "role-chooser", title, lead }}
    >
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl">
        {roles.map((role, index) => (
          <Reveal key={role.href} index={index} fill>
            <RoleCard {...role} />
          </Reveal>
        ))}
      </SimpleGrid>
    </Section>
  );
}
