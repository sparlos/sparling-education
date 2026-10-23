import {
  type AppBase,
  type Asset,
  type ContainerResource,
  type Entity,
  type RenderComponent,
  Vec3,
} from "playcanvas";
import type { Obstacle, Zone } from "./collision";
import { Ground } from "./ground";

const ISLAND_URL = `${import.meta.env.BASE_URL}hub_island.glb`;

/** Trunk or base radius (metres, before node scale) of each solid prop species. */
const SOLID_RADIUS: Record<string, number> = {
  AutumnTree: 0.4,
  AutumnTree2: 0.4,
  RoundTree: 0.4,
  Pine: 0.35,
  SnowPine: 0.35,
  Palm: 0.35,
  JungleTree: 0.7,
  Acacia: 0.3,
  DeadTree: 0.35,
  Cactus: 0.45,
  Mushroom: 0.6,
  Mushroom2: 0.4,
  CrystalBig: 1,
  IceCrystal: 0.8,
  Rock: 1.4,
  SandRock: 2,
  SnowRock: 1.6,
  LavaRock: 1.9,
  CrystalRock: 1.6,
};

/** Low props the player walks through. */
const DECORATION = new Set([
  "Bush",
  "AutumnBush",
  "Fern",
  "SavGrass",
  "Reed",
  "LilyPad",
  "MushSmall",
]);

const HOUSE_HALF = { x: 3.5, z: 3.05 };
/** Pillars sit either side of the portal's archway, in its local frame. */
const PORTAL_PILLAR = { offsetX: 3.1, halfX: 0.5, halfZ: 0.8 };
const PORTAL_CLEARANCE = 6;
const DOOR_CLEARANCE = 2;
const FOUNTAIN_RADIUS = 5.8;
const LAVA_POOL_RADIUS = 7.5;

export interface Island {
  root: Entity;
  ground: Ground;
  obstacles: Obstacle[];
  noBuildZones: Zone[];
}

function loadContainer(app: AppBase, url: string) {
  return new Promise<Asset>((resolve, reject) =>
    app.assets.loadFromUrl(url, "container", (err, asset) =>
      err || !asset
        ? reject(err ?? new Error(`Failed to load ${url}`))
        : resolve(asset),
    ),
  );
}

/** Rotation around Y in radians, read from the entity's world X axis. */
function yawOf(entity: Entity) {
  const right = entity.getWorldTransform().getX(new Vec3());
  return Math.atan2(-right.z, right.x);
}

function groundFrom(terrain: Entity): Ground {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const { mesh } of terrain.render?.meshInstances ?? []) {
    if (!mesh) continue;
    const base = positions.length / 3;
    const pos: number[] = [];
    const idx: number[] = [];
    mesh.getPositions(pos);
    mesh.getIndices(idx);
    for (const p of pos) positions.push(p);
    for (const i of idx) indices.push(base + i);
  }
  if (indices.length === 0) throw new Error("Terrain has no triangles");
  return Ground.fromTriangles(positions, indices, terrain.getWorldTransform());
}

/**
 * Loads the authored hub island and derives walking and building rules
 * from its node names. Duplicate props carry Blender suffixes like
 * `Forest_Pine.003`, so names are matched on their prefix.
 */
export async function loadIsland(app: AppBase): Promise<Island> {
  const asset = await loadContainer(app, ISLAND_URL);
  const root = (asset.resource as ContainerResource).instantiateRenderEntity();
  root.name = "island";
  app.root.addChild(root);

  const obstacles: Obstacle[] = [];
  const noBuildZones: Zone[] = [];
  const unknown = new Set<string>();
  let ground: Ground | null = null;

  // Everything on the island is static, so merge it into a few spatial batches.
  const batch = app.batcher.addGroup("island", false, 60);

  for (const node of root.children as Entity[]) {
    const name = node.name.replace(/\.\d+$/, "");
    const pos = node.getPosition();
    const scale = node.getLocalScale().x;
    const yaw = yawOf(node);

    for (const render of node.findComponents("render") as RenderComponent[])
      render.batchGroupId = batch.id;

    if (name === "Terrain") {
      ground = groundFrom(node);
    } else if (name === "Sea") {
      if (node.render) node.render.castShadows = false;
    } else if (name === "Fountain") {
      obstacles.push({ x: pos.x, z: pos.z, radius: FOUNTAIN_RADIUS * scale });
    } else if (name === "LavaPool") {
      obstacles.push({ x: pos.x, z: pos.z, radius: LAVA_POOL_RADIUS * scale });
    } else if (name.startsWith("House_")) {
      obstacles.push({
        x: pos.x,
        z: pos.z,
        halfX: HOUSE_HALF.x,
        halfZ: HOUSE_HALF.z,
        yaw,
      });
      const door = node.children[0] as Entity | undefined;
      if (door) {
        const d = door.getPosition();
        noBuildZones.push({
          kind: "ellipse",
          x: d.x,
          z: d.z,
          rx: DOOR_CLEARANCE,
          rz: DOOR_CLEARANCE,
        });
      }
    } else if (name.startsWith("Portal_")) {
      const pillar = new Vec3();
      for (const side of [-1, 1]) {
        node
          .getWorldTransform()
          .transformPoint(
            pillar.set(side * PORTAL_PILLAR.offsetX, 0, 0),
            pillar,
          );
        obstacles.push({
          x: pillar.x,
          z: pillar.z,
          halfX: PORTAL_PILLAR.halfX,
          halfZ: PORTAL_PILLAR.halfZ,
          yaw,
        });
      }
      noBuildZones.push({
        kind: "ellipse",
        x: pos.x,
        z: pos.z,
        rx: PORTAL_CLEARANCE,
        rz: PORTAL_CLEARANCE,
      });
    } else if (name.startsWith("Spawn_")) {
      // Position markers only.
    } else {
      // Biome props: `<Biome>_<Species>`.
      const species = name.slice(name.indexOf("_") + 1);
      const radius = SOLID_RADIUS[species];
      if (radius !== undefined)
        obstacles.push({ x: pos.x, z: pos.z, radius: radius * scale });
      else if (!DECORATION.has(species)) unknown.add(name);
    }
  }

  if (unknown.size > 0)
    console.warn("hub island: no collision rule for", [...unknown]);
  if (!ground) throw new Error("hub_island.glb has no Terrain node");
  return { root, ground, obstacles, noBuildZones };
}
