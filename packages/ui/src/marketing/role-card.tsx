import type { Audience } from "@repo/tokens";
import { Icon, type IconName } from "../icon";
import press from "../press.module.css";
import { ThemeIcon } from "../theme-icon";
import classes from "./role-card.module.css";

export interface RoleCardProps {
  tone: Audience;
  icon: IconName;
  title: string;
  body: string;
  href: string;
  cta: string;
}

/** A clickable 3D card that routes a visitor to their audience page. */
export function RoleCard({
  tone,
  icon,
  title,
  body,
  href,
  cta,
}: RoleCardProps) {
  return (
    <div className={classes.wrapper} data-tone={tone}>
      <a href={href} className={`${press.press} ${classes.card}`}>
        <ThemeIcon
          tone={tone}
          variant="filled"
          size="xl"
          className={classes.icon}
        >
          <Icon name={icon} size={32} />
        </ThemeIcon>
        <span className={classes.title}>{title}</span>
        <span className={classes.body}>{body}</span>
        <span className={classes.cta}>
          {cta}
          <span className={classes.arrow}>
            <Icon name="arrow-right" size={20} />
          </span>
        </span>
      </a>
    </div>
  );
}
