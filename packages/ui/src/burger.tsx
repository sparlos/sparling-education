import { Burger as MantineBurger } from "@mantine/core";

interface BurgerProps {
  opened: boolean;
  onClick: () => void;
  "aria-label": string;
  "aria-controls"?: string;
  className?: string;
}

export function Burger({
  opened,
  onClick,
  "aria-label": ariaLabel,
  "aria-controls": ariaControls,
  className,
}: BurgerProps) {
  return (
    <MantineBurger
      opened={opened}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-controls={ariaControls}
      aria-expanded={opened}
      color="var(--k-ink)"
      lineSize={3}
      className={className}
    />
  );
}
