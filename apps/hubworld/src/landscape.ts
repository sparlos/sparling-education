import {
  type AppBase,
  Color,
  ConeGeometry,
  Entity,
  Mesh,
  MeshInstance,
  StandardMaterial,
} from "playcanvas";

export const ISLAND_RADIUS = 30;

/** A circular footprint the player cannot walk through. */
export interface Obstacle {
  x: number;
  z: number;
  radius: number;
}

/** An area of ground where nothing may be built, such as a path or pond. */
export type Zone =
  | { kind: "rect"; minX: number; maxX: number; minZ: number; maxZ: number }
  | { kind: "ellipse"; x: number; z: number; rx: number; rz: number };

type Primitive = "box" | "sphere" | "cylinder" | "cone" | "capsule";

export interface ShapeOptions {
  type: Primitive;
  material: StandardMaterial;
  position: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
  shadows?: boolean;
}

// Deterministic RNG so the island looks the same on every load.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

export interface Landscape {
  obstacles: Obstacle[];
  noBuildZones: Zone[];
}

export function buildLandscape(app: AppBase): Landscape {
  const root = new Entity("landscape");
  app.root.addChild(root);

  const mats = {
    grass: material("#7ccf6a"),
    cliff: material("#c9a46b"),
    water: material("#5ec4e8"),
    path: material("#e8d7a9"),
    trunk: material("#8a5a3b"),
    leaf: material("#3fa34d"),
    leafLight: material("#5cbf5a"),
    pine: material("#2f7d4a"),
    rock: material("#9aa3a8"),
    wall: material("#fff4e0"),
    roof: material("#e0644f"),
    roofBlue: material("#4f7fe0"),
    door: material("#7a4b2a"),
    fence: material("#f3e3c3"),
    petals: ["#ff8fb1", "#ffd84d", "#ffffff", "#b58cff"].map(material),
  };

  const obstacles: Obstacle[] = [];
  const noBuildZones: Zone[] = [];
  const rand = mulberry32(7);

  // Ocean, island plateau and a cliff ring so the edge reads clearly.
  shape(root, {
    type: "box",
    material: mats.water,
    position: [0, -1.2, 0],
    scale: [400, 1, 400],
    shadows: false,
  });
  shape(root, {
    type: "cylinder",
    material: mats.cliff,
    // Top sits below the grass disc so the two faces never share a plane.
    position: [0, -0.7, 0],
    scale: [ISLAND_RADIUS * 2 + 1, 1.2, ISLAND_RADIUS * 2 + 1],
    shadows: false,
  });
  shape(root, {
    type: "cylinder",
    material: mats.grass,
    position: [0, -0.05, 0],
    scale: [ISLAND_RADIUS * 2, 0.1, ISLAND_RADIUS * 2],
    shadows: false,
  });

  // Dirt paths crossing the plaza.
  for (const [x, z, w, d] of [
    [0, 0, 3, 40],
    [0, 4, 36, 3],
  ] as const) {
    shape(root, {
      type: "box",
      material: mats.path,
      position: [x, 0.03, z],
      scale: [w, 0.04, d],
      shadows: false,
    });
    noBuildZones.push({
      kind: "rect",
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
    });
  }

  // Pond.
  const pond = { x: -12, z: -8, radius: 5 };
  shape(root, {
    type: "cylinder",
    material: mats.water,
    position: [pond.x, 0.04, pond.z],
    scale: [pond.radius * 2, 0.06, pond.radius * 1.5],
    shadows: false,
  });
  obstacles.push({ ...pond, radius: pond.radius * 0.8 });
  noBuildZones.push({
    kind: "ellipse",
    x: pond.x,
    z: pond.z,
    rx: pond.radius,
    rz: pond.radius * 0.75,
  });

  // Houses with pyramid roofs.
  const pyramidMesh = Mesh.fromGeometry(
    app.graphicsDevice,
    new ConeGeometry({ capSegments: 4 }),
  );
  const house = (x: number, z: number, roof: StandardMaterial) => {
    const h = new Entity("house");
    root.addChild(h);
    h.setLocalPosition(x, 0, z);
    shape(h, {
      type: "box",
      material: mats.wall,
      position: [0, 1.25, 0],
      scale: [4, 2.5, 4],
    });
    const roofEntity = new Entity("roof");
    roofEntity.addComponent("render", {
      meshInstances: [new MeshInstance(pyramidMesh, roof)],
      castShadows: true,
      receiveShadows: true,
    });
    h.addChild(roofEntity);
    roofEntity.setLocalPosition(0, 3.5, 0);
    roofEntity.setLocalEulerAngles(0, 45, 0);
    roofEntity.setLocalScale(6, 2, 6);
    shape(h, {
      type: "box",
      material: mats.door,
      position: [0, 0.8, 2.01],
      scale: [1, 1.6, 0.05],
    });
    obstacles.push({ x, z, radius: 2.8 });
  };
  house(-9, 12, mats.roof);
  house(10, 12, mats.roofBlue);
  house(12, -10, mats.roof);

  // Fence along the front of the left house.
  for (let i = 0; i < 6; i++) {
    const x = -13 + i * 1.4;
    shape(root, {
      type: "box",
      material: mats.fence,
      position: [x, 0.5, 16],
      scale: [0.2, 1, 0.2],
    });
  }
  shape(root, {
    type: "box",
    material: mats.fence,
    position: [-9.5, 0.75, 16],
    scale: [7.2, 0.15, 0.1],
  });
  obstacles.push({ x: -9.5, z: 16, radius: 0.8 });

  // Scatter trees, rocks and flowers, avoiding paths, buildings and each other.
  const isFree = (x: number, z: number, r: number) =>
    Math.hypot(x, z) < ISLAND_RADIUS - 2 &&
    Math.abs(x) > 2.5 + r &&
    Math.abs(z - 4) > 2.5 + r &&
    obstacles.every((o) => Math.hypot(x - o.x, z - o.z) > o.radius + r + 1);

  const scatter = (
    count: number,
    r: number,
    place: (x: number, z: number) => void,
  ) => {
    for (
      let placed = 0, tries = 0;
      placed < count && tries < count * 50;
      tries++
    ) {
      const angle = rand() * Math.PI * 2;
      const dist = Math.sqrt(rand()) * ISLAND_RADIUS;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (!isFree(x, z, r)) continue;
      place(x, z);
      placed++;
    }
  };

  scatter(22, 1, (x, z) => {
    const s = 0.8 + rand() * 0.5;
    if (rand() < 0.6) {
      shape(root, {
        type: "cylinder",
        material: mats.trunk,
        position: [x, 0.8 * s, z],
        scale: [0.4 * s, 1.6 * s, 0.4 * s],
      });
      shape(root, {
        type: "sphere",
        material: rand() < 0.5 ? mats.leaf : mats.leafLight,
        position: [x, 2.4 * s, z],
        scale: [2.2 * s, 2 * s, 2.2 * s],
      });
    } else {
      shape(root, {
        type: "cylinder",
        material: mats.trunk,
        position: [x, 0.5 * s, z],
        scale: [0.35 * s, 1 * s, 0.35 * s],
      });
      shape(root, {
        type: "cone",
        material: mats.pine,
        position: [x, 1.8 * s, z],
        scale: [2 * s, 2 * s, 2 * s],
      });
      shape(root, {
        type: "cone",
        material: mats.pine,
        position: [x, 2.8 * s, z],
        scale: [1.4 * s, 1.6 * s, 1.4 * s],
      });
    }
    obstacles.push({ x, z, radius: 0.5 * s });
  });

  scatter(10, 0.6, (x, z) => {
    const s = 0.5 + rand() * 0.8;
    shape(root, {
      type: "sphere",
      material: mats.rock,
      position: [x, 0.2 * s, z],
      scale: [1.2 * s, 0.8 * s, s],
      rotation: [0, rand() * 360, 0],
    });
    obstacles.push({ x, z, radius: 0.5 * s });
  });

  // Flower clumps are decoration only; the player walks through them.
  const flowers: Obstacle[] = [];
  scatter(30, 0.3, (x, z) => flowers.push({ x, z, radius: 0 }));
  for (const f of flowers) {
    const petals =
      mats.petals[Math.floor(rand() * mats.petals.length)] ?? mats.leaf;
    for (let i = 0; i < 3; i++) {
      shape(root, {
        type: "sphere",
        material: petals,
        position: [
          f.x + (rand() - 0.5) * 0.8,
          0.15,
          f.z + (rand() - 0.5) * 0.8,
        ],
        scale: [0.25, 0.25, 0.25],
        shadows: false,
      });
    }
  }

  return { obstacles, noBuildZones };
}
