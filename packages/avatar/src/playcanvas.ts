// The avatar in 3D, for the class world. Placeholder primitives until the
// illustrator's parts exist; each item's art is keyed by the same ID as its
// 2D art in ./portrait.tsx.
//
// Frame: the body is a capsule 2 tall and 1 wide whose centre is 1 above the
// root, so in the body's space the top of the head is at y 1 and the face
// points +z.
import { color } from "@repo/tokens";
import { Color, Entity, StandardMaterial } from "playcanvas";
import {
  type AvatarLook,
  bodies,
  type EyesId,
  type HeadwearId,
} from "./index.ts";

const materials = new Map<string, StandardMaterial>();

function material(hex: string): StandardMaterial {
  let mat = materials.get(hex);
  if (!mat) {
    mat = new StandardMaterial();
    mat.diffuse = new Color().fromString(hex);
    mat.update();
    materials.set(hex, mat);
  }
  return mat;
}

type Primitive = "box" | "capsule" | "cone" | "cylinder" | "sphere";

function part(
  parent: Entity,
  type: Primitive,
  hex: string,
  position: [number, number, number],
  scale: [number, number, number],
): Entity {
  const entity = new Entity(type);
  entity.addComponent("render", {
    type,
    material: material(hex),
    castShadows: true,
  });
  parent.addChild(entity);
  entity.setLocalPosition(...position);
  entity.setLocalScale(...scale);
  return entity;
}

const ink = color.ink.default;

const eyeArt: Record<EyesId, (body: Entity, x: number) => void> = {
  round: (body, x) =>
    part(body, "sphere", ink, [x, 0.35, 0.45], [0.12, 0.16, 0.12]),
  sparkle: (body, x) => {
    part(body, "sphere", ink, [x, 0.35, 0.45], [0.13, 0.17, 0.13]);
    part(
      body,
      "sphere",
      color.surface.raised,
      [x - 0.02, 0.39, 0.51],
      [0.04, 0.04, 0.04],
    );
  },
  sleepy: (body, x) =>
    part(body, "sphere", ink, [x, 0.33, 0.46], [0.12, 0.07, 0.12]),
};

const headwearArt: Record<HeadwearId, (body: Entity) => void> = {
  cap: (body) => {
    part(body, "sphere", color.brand.fill, [0, 0.78, 0], [1.04, 0.7, 1.04]);
    part(body, "box", color.brand.fill, [0, 0.7, 0.42], [0.6, 0.04, 0.4]);
  },
  beanie: (body) => {
    part(body, "sphere", bodies.berry, [0, 0.78, 0], [1.04, 0.7, 1.04]);
    part(body, "sphere", bodies.berry, [0, 1.18, 0], [0.2, 0.2, 0.2]);
  },
  crown: (body) => {
    part(body, "cylinder", bodies.sunshine, [0, 1.02, 0], [0.6, 0.2, 0.6]);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      part(
        body,
        "cone",
        bodies.sunshine,
        [Math.sin(angle) * 0.24, 1.2, Math.cos(angle) * 0.24],
        [0.12, 0.18, 0.12],
      );
    }
  },
};

/** The avatar in its look. The body is a child so it can bob independently. */
export function createAvatar(name: string, look: AvatarLook) {
  const root = new Entity(name);
  const body = part(root, "capsule", bodies[look.body], [0, 1, 0], [1, 1, 1]);
  body.name = "body";
  for (const x of [-0.18, 0.18]) eyeArt[look.eyes](body, x);
  if (look.headwear) headwearArt[look.headwear](body);
  return { root, body };
}
