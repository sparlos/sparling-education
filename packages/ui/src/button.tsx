import { UnstyledButton } from "@mantine/core";
import type { MouseEvent, ReactNode } from "react";
import classes from "./button.module.css";
import { cx } from "./cx";
import press from "./press.module.css";
import type { Tone } from "./tone";

interface ButtonProps {
  children: ReactNode;
  /** `primary` and `secondary` get the 3D press; `subtle` reads as a link. */
  variant?: "primary" | "secondary" | "subtle";
  /** Colour of a primary or subtle button. Secondary is always neutral. */
  tone?: Tone;
  size?: "md" | "lg";
  /** Renders a link instead of a button. */
  href?: string;
  type?: "button" | "submit";
  /** Gets the click, so a router can take over a link's navigation. */
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  /** For a button that opens and closes something: whether it's open. */
  "aria-expanded"?: boolean;
  fullWidth?: boolean;
  leftSection?: ReactNode;
  rightSection?: ReactNode;
  className?: string;
  /** Names the button for a walkthrough step to point at. */
  "data-walkthrough"?: string;
}

export function Button({
  children,
  variant = "primary",
  tone = "brand",
  size = "md",
  href,
  type = "button",
  onClick,
  disabled,
  "aria-expanded": expanded,
  fullWidth,
  leftSection,
  rightSection,
  className,
  "data-walkthrough": walkthrough,
}: ButtonProps) {
  const shared = {
    className: cx(
      classes.root,
      variant === "subtle" ? classes.subtle : press.press,
      className,
    ),
    "data-size": size,
    "data-tone": variant === "secondary" ? "neutral" : tone,
    "data-full-width": fullWidth || undefined,
    "aria-expanded": expanded,
    "data-walkthrough": walkthrough,
    onClick,
  };
  const content = (
    <>
      {leftSection && <span className={classes.section}>{leftSection}</span>}
      {children}
      {rightSection && <span className={classes.section}>{rightSection}</span>}
    </>
  );

  if (href) {
    return (
      <UnstyledButton component="a" href={href} {...shared}>
        {content}
      </UnstyledButton>
    );
  }
  return (
    <UnstyledButton type={type} disabled={disabled} {...shared}>
      {content}
    </UnstyledButton>
  );
}
