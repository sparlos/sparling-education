import { initialTint } from "@repo/tokens";
import type { CSSProperties } from "react";
import classes from "./initial-circle.module.css";

interface InitialCircleProps {
  /** Picks the tint, so a student keeps theirs on every screen. */
  id: string;
  /** Whose initial: the first letter shows. */
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * A student's coloured circle with their initial. Decoration only: their
 * name is always beside it, so the letter is drawn by CSS and is never part
 * of the text around it.
 */
export function InitialCircle({
  id,
  name,
  size = "md",
  className,
}: InitialCircleProps) {
  const tint = initialTint(id);
  return (
    <span
      aria-hidden="true"
      data-size={size}
      data-initial={name.trim().charAt(0).toLocaleUpperCase("en-CA")}
      className={`${classes.circle} ${className ?? ""}`}
      style={
        {
          "--initial-fill": tint.fill,
          "--initial-text": tint.text,
        } as CSSProperties
      }
    />
  );
}
