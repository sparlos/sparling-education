import { Select as MantineSelect } from "@mantine/core";
import classes from "./input.module.css";

interface SelectProps {
  label: string;
  name: string;
  data: string[] | { value: string; label: string }[];
  description?: string;
  placeholder?: string;
  required?: boolean;
  value?: string | null;
  onChange?: (value: string | null) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({
  label,
  name,
  data,
  description,
  placeholder,
  required,
  value,
  onChange,
  error,
  disabled,
  className,
}: SelectProps) {
  return (
    <MantineSelect
      label={label}
      name={name}
      data={data}
      description={description}
      placeholder={placeholder}
      required={required}
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
      allowDeselect={false}
      checkIconPosition="right"
      className={className}
      classNames={{
        input: classes.input,
        label: classes.label,
        description: classes.description,
        required: classes.required,
      }}
    />
  );
}
