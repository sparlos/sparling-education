import { UnstyledButton } from "@mantine/core";
import type { ReactNode } from "react";
import classes from "./button.module.css";
import press from "./press.module.css";

export type ButtonTone = "brand" | "educator" | "parent" | "student";

interface ButtonProps {
  children: ReactNode;
  /** `primary` and `secondary` get the 3D press; `subtle` reads as a link. */
  variant?: "primary" | "secondary" | "subtle";
  /** Colour of a primary or subtle button. Secondary is always neutral. */
  tone?: ButtonTone;
  size?: "md" | "lg";
  /** Renders a link instead of a button. */
  href?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  leftSection?: ReactNode;
  rightSection?: ReactNode;
  className?: string;
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
  fullWidth,
  leftSection,
  rightSection,
  className,
}: ButtonProps) {
  const shared = {
    className: [
      classes.root,
      variant === "subtle" ? classes.subtle : press.press,
      className,
    ]
      .filter(Boolean)
      .join(" "),
    "data-size": size,
    "data-tone": variant === "secondary" ? "neutral" : tone,
    "data-full-width": fullWidth || undefined,
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
