import { Loader as MantineLoader } from "@mantine/core";

interface LoaderProps {
  /** What's loading, for screen readers. */
  label: string;
  size?: "md" | "lg" | "xl";
}

export function Loader({ label, size = "lg" }: LoaderProps) {
  return (
    <MantineLoader
      type="dots"
      color="ember"
      size={size}
      role="progressbar"
      aria-label={label}
    />
  );
}
