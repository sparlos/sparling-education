import { type ClassColourSlug, classColour } from "@repo/tokens";
import type { CSSProperties, ReactNode } from "react";
import { classColourVariables } from "./theme";

interface ClassColourScopeProps {
  /** A class colour's slug; an unknown one falls back to the brand's. */
  colour: ClassColourSlug | string;
  children: ReactNode;
  /** The element it renders: a plain wrapper by default. */
  as?: "div" | "section" | "main";
  className?: string;
  "aria-labelledby"?: string;
  "aria-busy"?: boolean;
}

/**
 * Everything inside takes the class colour: `tone="accent"` components, the
 * `--k-accent-*` variables and the results ramp (`--k-result-*`). It writes
 * the slug as `data-class-colour`, the one thing tests can see of it. Portals
 * (menus, tooltips) render outside it, in the brand's colour.
 */
export function ClassColourScope({
  colour,
  children,
  as: Element = "div",
  className,
  "aria-labelledby": labelledBy,
  "aria-busy": busy,
}: ClassColourScopeProps) {
  const found = classColour(colour);
  return (
    // `data-tone` re-points the `--tone-*` variables here, so links and
    // anything else in the ancestor's tone take the class colour too.
    <Element
      data-class-colour={found.slug}
      data-tone="accent"
      style={classColourVariables(found) as CSSProperties}
      className={className}
      aria-labelledby={labelledBy}
      aria-busy={busy}
    >
      {children}
    </Element>
  );
}
