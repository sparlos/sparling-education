import type { ReactNode } from "react";
import { Button } from "./button";
import { Chevron } from "./chevron";
import type { Tone } from "./tone";

interface DisclosureButtonProps {
  children: ReactNode;
  /** Whether the content it shows and hides is showing. */
  open: boolean;
  onToggle(): void;
  variant?: "primary" | "secondary" | "subtle";
  tone?: Tone;
  size?: "md" | "lg";
  className?: string;
  /** Names the button for a walkthrough step to point at. */
  "data-walkthrough"?: string;
}

/** A button that shows and hides content, with a chevron saying which. */
export function DisclosureButton({
  open,
  onToggle,
  ...button
}: DisclosureButtonProps) {
  return (
    <Button
      {...button}
      aria-expanded={open}
      onClick={onToggle}
      rightSection={<Chevron open={open} />}
    />
  );
}
