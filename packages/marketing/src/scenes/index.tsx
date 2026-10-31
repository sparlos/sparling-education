// Scene kind → component. A new kind needs its props in src/brief.ts and an
// entry here; the type checker enforces both.
import type { ComponentType } from "react";
import type { Scene, SceneKind } from "../brief.ts";
import { ClassCheer } from "./ClassCheer.tsx";
import { EndCard } from "./EndCard.tsx";
import { Features } from "./Features.tsx";
import { FractionHop } from "./FractionHop.tsx";
import { Kinetic } from "./Kinetic.tsx";
import { Logo } from "./Logo.tsx";
import { NotAQuiz } from "./NotAQuiz.tsx";
import { Screen } from "./Screen.tsx";
import { TeacherView } from "./TeacherView.tsx";

export const scenes: {
  [K in SceneKind]: ComponentType<Extract<Scene, { kind: K }>>;
} = {
  kinetic: Kinetic,
  "not-a-quiz": NotAQuiz,
  class: ClassCheer,
  logo: Logo,
  "fraction-hop": FractionHop,
  "teacher-view": TeacherView,
  screen: Screen,
  features: Features,
  "end-card": EndCard,
};

export function SceneView({ scene }: { scene: Scene }) {
  const Component = scenes[scene.kind] as ComponentType<Scene>;
  return <Component {...scene} />;
}
