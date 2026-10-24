// Every prototype in the lab, by slug: each folder here with an index.tsx.
// Adding the folder is all it takes to list it.
import type { PrototypeModule } from "./prototype.ts";

export type PrototypeRegistry = Readonly<Record<string, PrototypeModule>>;

const modules = import.meta.glob<PrototypeModule>("./*/index.tsx", {
  eager: true,
});

export const prototypes: PrototypeRegistry = Object.fromEntries(
  Object.entries(modules).map(([path, module]) => [
    path.slice("./".length, -"/index.tsx".length),
    module,
  ]),
);
