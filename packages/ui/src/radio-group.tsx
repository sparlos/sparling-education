import { Group, RadioGroup as MantineRadioGroup, Radio } from "@mantine/core";
import { inputClassNames } from "./input";

interface RadioGroupProps {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  /** Null while none is picked. */
  value: string | null;
  onChange(value: string): void;
  className?: string;
}

/**
 * A row of radios, for picking one option. Uses `RadioGroup` rather than
 * `Radio.Group`, like `CheckboxGroup`.
 */
export function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  className,
}: RadioGroupProps) {
  return (
    <MantineRadioGroup
      label={label}
      name={name}
      value={value}
      onChange={onChange}
      className={className}
      classNames={inputClassNames}
    >
      <Group gap="lg">
        {options.map((option) => (
          <Radio
            key={option.value}
            value={option.value}
            label={option.label}
            size="md"
          />
        ))}
      </Group>
    </MantineRadioGroup>
  );
}
