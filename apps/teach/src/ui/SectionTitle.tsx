// A section's heading, with its icon tile in a soft tint: the class colour,
// or a fixed meaning colour (amber misconceptions, pink recognition).
import { Icon, type IconName } from "@repo/ui/icon";
import { ThemeIcon } from "@repo/ui/theme-icon";
import { Title } from "@repo/ui/title";
import type { Tone } from "@repo/ui/tone";
import type { ReactNode } from "react";
import classes from "./section-title.module.css";

export function SectionTitle({
  id,
  icon,
  tone = "accent",
  order = 2,
  size = "h4",
  children,
}: {
  id: string;
  icon: IconName;
  tone?: Tone;
  order?: 2 | 3;
  size?: "h4" | "h5";
  children: ReactNode;
}) {
  return (
    <div className={classes.heading}>
      <ThemeIcon tone={tone} size="sm">
        <Icon name={icon} size={20} />
      </ThemeIcon>
      <Title order={order} size={size} id={id}>
        {children}
      </Title>
    </div>
  );
}
