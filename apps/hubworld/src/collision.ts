/** A circular footprint on the ground. */
export interface Circle {
  x: number;
  z: number;
  radius: number;
}

/** A rectangular footprint turned `yaw` radians around Y, like a house. */
export interface Box {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
  yaw: number;
}

/** Something the player cannot walk through. */
export type Obstacle = Circle | Box;

/** An area of ground where nothing may be built, such as a doorway. */
export type Zone =
  | { kind: "rect"; minX: number; maxX: number; minZ: number; maxZ: number }
  | { kind: "ellipse"; x: number; z: number; rx: number; rz: number };

interface Point {
  x: number;
  z: number;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(v, hi));

/**
 * Moves `pos` out of the obstacle so a circle of `radius` there just
 * touches it. Returns whether it had to move.
 */
export function pushOut(o: Obstacle, pos: Point, radius: number): boolean {
  const dx = pos.x - o.x;
  const dz = pos.z - o.z;
  if ("radius" in o) {
    const dist = Math.hypot(dx, dz);
    const min = o.radius + radius;
    if (dist >= min || dist < 1e-4) return false;
    pos.x = o.x + (dx / dist) * min;
    pos.z = o.z + (dz / dist) * min;
    return true;
  }
  // Work in the box's frame, where it spans ±half on each axis.
  const cos = Math.cos(o.yaw);
  const sin = Math.sin(o.yaw);
  let lx = dx * cos - dz * sin;
  let lz = dx * sin + dz * cos;
  const cx = clamp(lx, -o.halfX, o.halfX);
  const cz = clamp(lz, -o.halfZ, o.halfZ);
  const dist = Math.hypot(lx - cx, lz - cz);
  if (dist >= radius) return false;
  if (dist > 1e-4) {
    lx = cx + ((lx - cx) / dist) * radius;
    lz = cz + ((lz - cz) / dist) * radius;
  } else if (o.halfX - Math.abs(lx) < o.halfZ - Math.abs(lz)) {
    // Centre is inside: leave through the nearest side.
    lx = Math.sign(lx || 1) * (o.halfX + radius);
  } else {
    lz = Math.sign(lz || 1) * (o.halfZ + radius);
  }
  pos.x = o.x + lx * cos + lz * sin;
  pos.z = o.z - lx * sin + lz * cos;
  return true;
}

/** Whether a circle of `radius` at (x, z) overlaps the obstacle. */
export function overlaps(o: Obstacle, x: number, z: number, radius: number) {
  if ("radius" in o) return Math.hypot(x - o.x, z - o.z) < o.radius + radius;
  return pushOut(o, { x, z }, radius);
}
