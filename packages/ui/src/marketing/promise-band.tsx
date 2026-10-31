import type { ReactNode } from "react";
import { Icon, type IconName } from "../icon";
import { Title } from "../title";
import { DecorLayer, Glint, Sparkle } from "./decor";
import classes from "./promise-band.module.css";
import { Reveal } from "./reveal";

export interface PromiseItem {
  icon: IconName;
  label: string;
}

interface PromiseBandProps {
  title: ReactNode;
  body: ReactNode;
  /** Short promises shown as chips, e.g. "No ads". */
  items: PromiseItem[];
}

/** A dark, high-emphasis panel for the platform's "never pays" promise. */
export function PromiseBand({ title, body, items }: PromiseBandProps) {
  return (
    <div className={classes.panel}>
      <DecorLayer>
        <Glint size={18} left="8%" top="22%" float />
        <Glint size={12} left="5%" bottom="14%" opacity={0.7} float />
        <Sparkle size={22} right="9%" top="18%" float />
        <Glint size={14} right="5%" bottom="12%" color="sparkle" float />
      </DecorLayer>
      <div className={classes.content}>
        <Title order={2} size="h2" c="inverse">
          {title}
        </Title>
        <p className={classes.body}>{body}</p>
        <ul className={classes.items}>
          {items.map((item, index) => (
            <Reveal
              key={item.label}
              as="li"
              variant="pop"
              index={index}
              className={classes.item}
            >
              <span className={classes.itemIcon}>
                <Icon name={item.icon} size={20} />
              </span>
              {item.label}
            </Reveal>
          ))}
        </ul>
      </div>
    </div>
  );
}
