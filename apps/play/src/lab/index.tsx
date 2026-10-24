// The lab with every prototype in it, for main.tsx to load in dev.
import Lab, { type LabProps } from "./Lab.tsx";
import { prototypes } from "./registry.ts";

export default function LabWithPrototypes(props: Omit<LabProps, "prototypes">) {
  return <Lab {...props} prototypes={prototypes} />;
}
