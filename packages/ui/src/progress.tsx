import { Progress as MantineProgress } from "@mantine/core";

interface ProgressProps {
  /** 0–100. */
  value: number;
  /** What's progressing, for screen readers. */
  label: string;
  /** Track height in px: thin by default, like a page's scroll bar. */
  size?: number;
}

/** A thin determinate bar in the ancestor's tone (`data-tone`). */
export function Progress({ value, label, size = 6 }: ProgressProps) {
  return (
    <MantineProgress
      value={value}
      size={size}
      radius="xl"
      color="var(--tone-fill)"
      transitionDuration={400}
      aria-label={label}
    />
  );
}
