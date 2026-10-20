import { Title as MantineTitle } from "@mantine/core";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { type InkColor, inkVar } from "./ink";
import classes from "./title.module.css";

interface TitleProps {
  children: ReactNode;
  order?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Visual size, independent of `order`. `display` is the hero size. */
  size?: "display" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  c?: InkColor;
  id?: string;
  className?: string;
}

export function Title({
  children,
  order = 2,
  size,
  c = "ink",
  id,
  className,
}: TitleProps) {
  const display = size === "display";
  return (
    <MantineTitle
      order={order}
      size={display ? undefined : size}
      c={inkVar(c)}
      id={id}
      className={cx(display && classes.display, className)}
    >
      {children}
    </MantineTitle>
  );
}
