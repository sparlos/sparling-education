import { TextInput as MantineTextInput } from "@mantine/core";
import { inputClassNames } from "./input";

interface TextInputProps {
  label: string;
  name: string;
  type?: "text" | "email";
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  error?: string;
  className?: string;
}

export function TextInput({
  label,
  name,
  type = "text",
  placeholder,
  required,
  autoComplete,
  error,
  className,
}: TextInputProps) {
  return (
    <MantineTextInput
      label={label}
      name={name}
      type={type}
      placeholder={placeholder}
      required={required}
      autoComplete={autoComplete}
      error={error}
      className={className}
      classNames={inputClassNames}
    />
  );
}
