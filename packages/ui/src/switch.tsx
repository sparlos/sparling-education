import { Switch as MantineSwitch } from "@mantine/core";
import type { ReactNode } from "react";
import { inputClassNames } from "./input";
import type { Tone } from "./tone";

interface SwitchProps {
  label: ReactNode;
  /** Said under the label, e.g. what being on means. */
  description?: ReactNode;
  checked: boolean;
  onChange(checked: boolean): void;
  disabled?: boolean;
  tone?: Tone;
  className?: string;
}

/** An on/off switch, for a setting that takes effect at once. */
export function Switch({
  label,
  description,
  checked,
  onChange,
  disabled,
  tone = "accent",
  className,
}: SwitchProps) {
  return (
    <MantineSwitch
      data-tone={tone}
      label={label}
      description={description}
      checked={checked}
      onChange={(event) => onChange(event.currentTarget.checked)}
      disabled={disabled}
      size="md"
      color="var(--tone-fill)"
      className={className}
      classNames={{
        label: inputClassNames.label,
        description: inputClassNames.description,
      }}
    />
  );
}
