import { TextInput as MantineTextInput } from "@mantine/core";
import type { ChangeEvent } from "react";
import classes from "./input.module.css";

interface TextInputProps {
  label: string;
  name: string;
  type?: "text" | "email";
  description?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function TextInput({
  label,
  name,
  type = "text",
  description,
  placeholder,
  required,
  autoComplete,
  value,
  onChange,
  error,
  disabled,
  className,
}: TextInputProps) {
  return (
    <MantineTextInput
      label={label}
      name={name}
      type={type}
      description={description}
      placeholder={placeholder}
      required={required}
      autoComplete={autoComplete}
      value={value}
      onChange={
        onChange
          ? (event: ChangeEvent<HTMLInputElement>) =>
              onChange(event.currentTarget.value)
          : undefined
      }
      error={error}
      disabled={disabled}
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
