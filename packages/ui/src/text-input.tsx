import { TextInput as MantineTextInput } from "@mantine/core";
import { inputClassNames } from "./input";

interface TextInputProps {
  label: string;
  name: string;
  type?: "text" | "email" | "search" | "number";
  /** For a number: the smallest and largest it takes. */
  min?: number;
  max?: number;
  /** The on-screen keyboard to offer, e.g. "numeric". */
  inputMode?: "text" | "numeric";
  placeholder?: string;
  /** Only a screen reader says the label; the box shows it as its placeholder. */
  hideLabel?: boolean;
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
  hideLabel,
  required,
  autoComplete,
  maxLength,
  min,
  max,
  inputMode,
  error,
  className,
  value,
  onChange,
}: TextInputProps) {
  return (
    <MantineTextInput
      label={hideLabel ? undefined : label}
      aria-label={hideLabel ? label : undefined}
      name={name}
      type={type}
      placeholder={placeholder ?? (hideLabel ? label : undefined)}
      required={required}
      autoComplete={autoComplete}
      maxLength={maxLength}
      min={min}
      max={max}
      inputMode={inputMode}
      error={error}
      className={className}
      value={value}
      onChange={onChange && ((event) => onChange(event.currentTarget.value))}
      classNames={inputClassNames}
    />
  );
}
