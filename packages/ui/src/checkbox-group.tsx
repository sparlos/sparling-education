import {
  Checkbox,
  CheckboxGroup as MantineCheckboxGroup,
  Group,
} from "@mantine/core";
import { inputClassNames } from "./input";

interface CheckboxGroupProps {
  label: string;
  /** Submitted as one field: the checked values, comma-separated. */
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string[];
  error?: string;
  className?: string;
}

/**
 * A row of checkboxes, for picking one or more options. Uses `CheckboxGroup`
 * rather than `Checkbox.Group`, which is undefined in server components.
 */
export function CheckboxGroup({
  label,
  name,
  options,
  defaultValue,
  error,
  className,
}: CheckboxGroupProps) {
  return (
    <MantineCheckboxGroup
      label={label}
      name={name}
      defaultValue={defaultValue}
      error={error}
      className={className}
      classNames={inputClassNames}
    >
      <Group gap="lg">
        {options.map((option) => (
          <Checkbox
            key={option.value}
            value={option.value}
            label={option.label}
            size="md"
          />
        ))}
      </Group>
    </MantineCheckboxGroup>
  );
}
