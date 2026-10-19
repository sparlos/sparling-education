import type { Obstacle, Zone } from "../landscape";

/** Everything a placement is checked against. Pure data, so the rules stay testable. */
export interface PlacementWorld {
  islandRadius: number;
  /** Margin kept clear between a footprint and the island's edge. */
  edgeMargin: number;
  noBuildZones: Zone[];
  /** Walk-blocking obstacles, from the landscape and from solid placed items. */
  obstacles: Obstacle[];
  /** Footprints of everything placed so far, solid or not. */
  placed: Obstacle[];
  player: Obstacle;
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

const overlaps = (o: Obstacle, x: number, z: number, r: number) =>
  Math.hypot(x - o.x, z - o.z) < o.radius + r;

/** Checks whether a footprint of `radius` can be placed at (x, z). */
export function checkPlacement(
  x: number,
  z: number,
  radius: number,
  world: PlacementWorld,
): PlacementResult {
  if (Math.hypot(x, z) + radius > world.islandRadius - world.edgeMargin)
    return { ok: false, reason: "Too close to the edge" };
  if (world.noBuildZones.some((zone) => zoneOverlaps(zone, x, z, radius)))
    return { ok: false, reason: "Can't build on paths or water" };
  if (
    world.obstacles.some((o) => overlaps(o, x, z, radius)) ||
    world.placed.some((o) => overlaps(o, x, z, radius))
  )
    return { ok: false, reason: "Something's in the way" };
  if (overlaps(world.player, x, z, radius))
    return { ok: false, reason: "You're standing there" };
  return { ok: true };
}
