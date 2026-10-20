import { Select as MantineSelect } from "@mantine/core";
import { inputClassNames } from "./input";

interface SelectProps {
  label: string;
  name: string;
  data: string[] | { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function Select({
  label,
  name,
  data,
  placeholder,
  required,
  className,
}: SelectProps) {
  return (
    <MantineSelect
      label={label}
      name={name}
      data={data}
      placeholder={placeholder}
      required={required}
      allowDeselect={false}
      checkIconPosition="right"
      className={className}
      classNames={inputClassNames}
    />
  );
}
