import type { ReactNode } from "react";
import type { ButtonTone } from "../button";
import { Title } from "../title";
import classes from "./cta-band.module.css";
import { DecorLayer, Sparkle } from "./decor";

interface CtaBandProps {
  title: ReactNode;
  lead?: ReactNode;
  /** The action: a form, buttons or a short message. */
  children: ReactNode;
  tone?: ButtonTone;
  /** `split` puts the action beside the copy; `stacked` centres both. */
  layout?: "split" | "stacked";
  id?: string;
}

/** A tinted closing panel that asks the visitor to act. */
export function CtaBand({
  title,
  lead,
  children,
  tone = "brand",
  layout = "split",
  id,
}: CtaBandProps) {
  return (
    <div
      className={classes.panel}
      data-tone={tone}
      data-layout={layout}
      id={id}
    >
      <DecorLayer>
        <Sparkle size={26} right="4%" top="10%" color="tone" opacity={0.5} />
        <Sparkle size={16} right="10%" top="26%" opacity={0.8} />
      </DecorLayer>
      <div className={classes.copy}>
        <Title order={2} size="h2">
          {title}
        </Title>
        {lead && <p className={classes.lead}>{lead}</p>}
      </div>
      <div className={classes.action}>{children}</div>
    </div>
  );
}
