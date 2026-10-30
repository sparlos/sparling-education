import { IconChevronDown } from "@tabler/icons-react";
import classes from "./chevron.module.css";
import { cx } from "./cx";

interface ChevronProps {
  /** Whether what it shows is open: it points down to open, up to close. */
  open: boolean;
  size?: number;
  className?: string;
}

/**
 * The spinning chevron on anything that shows and hides content. A button
 * with text uses `DisclosureButton`; a custom toggle puts this inside it.
 */
export function Chevron({ open, size = 18, className }: ChevronProps) {
  return (
    <span
      className={cx(classes.chevron, className)}
      data-open={open || undefined}
      aria-hidden
    >
      <IconChevronDown size={size} stroke={2.5} />
    </span>
  );
}
