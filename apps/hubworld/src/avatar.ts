import { Color, Entity, StandardMaterial } from "playcanvas";

function material(hex: string): StandardMaterial {
  const mat = new StandardMaterial();
  mat.diffuse = new Color().fromString(hex);
  mat.update();
  return mat;
}

const eyeMat = material("#2b2b2b");

/** A capsule with eyes so its facing is visible. The body is a child so it can bob independently. */
export function createAvatar(name: string, hex: string) {
  const root = new Entity(name);
  const body = new Entity("body");
  body.addComponent("render", {
    type: "capsule",
    material: material(hex),
    castShadows: true,
  });
  root.addChild(body);
  body.setLocalPosition(0, 1, 0);
  for (const x of [-0.18, 0.18]) {
    const eye = new Entity("eye");
    eye.addComponent("render", { type: "sphere", material: eyeMat });
    body.addChild(eye);
    eye.setLocalPosition(x, 0.35, 0.45);
    eye.setLocalScale(0.12, 0.16, 0.12);
  }
  return { root, body };
}
