import { Color, Entity, StandardMaterial } from "playcanvas";

type Primitive = "box" | "sphere" | "cylinder" | "cone" | "capsule";

export interface ShapeOptions {
  type: Primitive;
  material: StandardMaterial;
  position: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
  shadows?: boolean;
}

export function material(hex: string): StandardMaterial {
  const mat = new StandardMaterial();
  mat.diffuse = new Color().fromString(hex);
  mat.gloss = 0.2;
  mat.update();
  return mat;
}

export function shape(parent: Entity, opts: ShapeOptions): Entity {
  const entity = new Entity(opts.type);
  entity.addComponent("render", {
    type: opts.type,
    material: opts.material,
    castShadows: opts.shadows ?? true,
    receiveShadows: true,
  });
  parent.addChild(entity);
  entity.setLocalPosition(...opts.position);
  if (opts.scale) entity.setLocalScale(...opts.scale);
  if (opts.rotation) entity.setLocalEulerAngles(...opts.rotation);
  return entity;
}
