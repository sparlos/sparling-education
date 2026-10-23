import { type Circle, type Obstacle, overlaps, type Zone } from "../collision";

/** Everything a placement is checked against. Pure data, so the rules stay testable. */
export interface PlacementWorld {
  /** Whether the ground at (x, z) is land rather than water. */
  isDry: (x: number, z: number) => boolean;
  noBuildZones: Zone[];
  /** Walk-blocking obstacles, from the island and from solid placed items. */
  obstacles: Obstacle[];
  /** Footprints of everything placed so far, solid or not. */
  placed: Circle[];
  player: Circle;
}

export type PlacementResult = { ok: true } | { ok: false; reason: string };

function zoneOverlaps(zone: Zone, x: number, z: number, r: number) {
  if (zone.kind === "rect") {
    const dx = x - Math.max(zone.minX, Math.min(x, zone.maxX));
    const dz = z - Math.max(zone.minZ, Math.min(z, zone.maxZ));
    return dx * dx + dz * dz < r * r;
  }
  const nx = (x - zone.x) / (zone.rx + r);
  const nz = (z - zone.z) / (zone.rz + r);
  return nx * nx + nz * nz < 1;
}

/** The footprint's centre plus four points on its rim. */
const footprintPoints = (x: number, z: number, r: number) => [
  [x, z],
  [x + r, z],
  [x - r, z],
  [x, z + r],
  [x, z - r],
];

/** Checks whether a footprint of `radius` can be placed at (x, z). */
export function checkPlacement(
  x: number,
  z: number,
  radius: number,
  world: PlacementWorld,
): PlacementResult {
  if (
    !footprintPoints(x, z, radius).every(([px = 0, pz = 0]) =>
      world.isDry(px, pz),
    )
  )
    return { ok: false, reason: "Too close to the water" };
  if (world.noBuildZones.some((zone) => zoneOverlaps(zone, x, z, radius)))
    return { ok: false, reason: "Keep doorways and portals clear" };
  if (
    world.obstacles.some((o) => overlaps(o, x, z, radius)) ||
    world.placed.some((o) => overlaps(o, x, z, radius))
  )
    return { ok: false, reason: "Something's in the way" };
  if (overlaps(world.player, x, z, radius))
    return { ok: false, reason: "You're standing there" };
  return { ok: true };
}
