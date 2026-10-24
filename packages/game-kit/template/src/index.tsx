// Template Game: tap the bigger of two unit fractions. See ../SPEC.md.
import { defineGame } from "@repo/game-contract";
import { TemplateGame } from "./game/TemplateGame.tsx";
import { manifest } from "./manifest.ts";

export default defineGame(manifest, TemplateGame);
