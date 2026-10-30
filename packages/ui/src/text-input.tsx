import { TextInput as MantineTextInput } from "@mantine/core";
import { inputClassNames } from "./input";

interface TextInputProps {
  label: string;
  name: string;
  type?: "text" | "email" | "search";
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  maxLength?: number;
  error?: string;
  className?: string;
  /** Controlled: the value, and each change to it. */
  value?: string;
  onChange?(value: string): void;
}

export function TextInput({
  label,
  name,
  type = "text",
  placeholder,
  required,
  autoComplete,
  maxLength,
  error,
  className,
  value,
  onChange,
}: TextInputProps) {
  return (
    <MantineTextInput
      label={label}
      name={name}
      type={type}
      placeholder={placeholder}
      required={required}
      autoComplete={autoComplete}
      maxLength={maxLength}
      error={error}
      className={className}
      value={value}
      onChange={onChange && ((event) => onChange(event.currentTarget.value))}
      classNames={inputClassNames}
    />
  );
}
