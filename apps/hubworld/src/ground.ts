import { type Mat4, type Ray, Vec3 } from "playcanvas";

/** Height of the sea surface; ground below it is water. */
export const WATER_LEVEL = 0;
/** How far the terrain must rise above the sea before it counts as land. */
const SHORE_MARGIN = 0.05;
const CELL = 0.5;
const RAY_STEP = 0.5;
const RAY_MAX = 400;

/**
 * Terrain heights sampled onto a regular grid, so the player can follow
 * hills and stay out of the water without a physics engine.
 */
export class Ground {
  private constructor(
    private heights: Float32Array,
    private minX: number,
    private minZ: number,
    private cols: number,
    private rows: number,
  ) {}

  /** Rasterises triangles (world-space after `transform`) into a height grid. */
  static fromTriangles(
    positions: ArrayLike<number>,
    indices: ArrayLike<number>,
    transform: Mat4,
  ): Ground {
    const count = positions.length / 3;
    const xs = new Float32Array(count);
    const ys = new Float32Array(count);
    const zs = new Float32Array(count);
    const p = new Vec3();
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < count; i++) {
      p.set(
        positions[i * 3] ?? 0,
        positions[i * 3 + 1] ?? 0,
        positions[i * 3 + 2] ?? 0,
      );
      const { x, y, z } = transform.transformPoint(p, p);
      xs[i] = x;
      ys[i] = y;
      zs[i] = z;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }

    const cols = Math.ceil((maxX - minX) / CELL) + 1;
    const rows = Math.ceil((maxZ - minZ) / CELL) + 1;
    const heights = new Float32Array(cols * rows).fill(-Infinity);

    for (let t = 0; t + 2 < indices.length; t += 3) {
      const a = indices[t] ?? 0;
      const b = indices[t + 1] ?? 0;
      const c = indices[t + 2] ?? 0;
      const ax = xs[a] ?? 0,
        az = zs[a] ?? 0,
        ay = ys[a] ?? 0;
      const bx = xs[b] ?? 0,
        bz = zs[b] ?? 0,
        by = ys[b] ?? 0;
      const cx = xs[c] ?? 0,
        cz = zs[c] ?? 0,
        cy = ys[c] ?? 0;
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-9) continue;
      const c0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - minX) / CELL));
      const c1 = Math.min(
        cols - 1,
        Math.ceil((Math.max(ax, bx, cx) - minX) / CELL),
      );
      const r0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - minZ) / CELL));
      const r1 = Math.min(
        rows - 1,
        Math.ceil((Math.max(az, bz, cz) - minZ) / CELL),
      );
      for (let r = r0; r <= r1; r++) {
        const z = minZ + r * CELL;
        for (let col = c0; col <= c1; col++) {
          const x = minX + col * CELL;
          // Barycentric weights; a small tolerance closes seams between triangles.
          const w0 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det;
          const w1 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det;
          const w2 = 1 - w0 - w1;
          if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue;
          const i = r * cols + col;
          heights[i] = Math.max(
            heights[i] ?? -Infinity,
            w0 * ay + w1 * by + w2 * cy,
          );
        }
      }
    }
    return new Ground(heights, minX, minZ, cols, rows);
  }

  /** Terrain height at (x, z), or -Infinity off the terrain. */
  height(x: number, z: number): number {
    const fx = (x - this.minX) / CELL;
    const fz = (z - this.minZ) / CELL;
    const c = Math.floor(fx);
    const r = Math.floor(fz);
    if (c < 0 || r < 0 || c >= this.cols - 1 || r >= this.rows - 1)
      return -Infinity;
    const i = r * this.cols + c;
    const h00 = this.heights[i] ?? -Infinity;
    const h10 = this.heights[i + 1] ?? -Infinity;
    const h01 = this.heights[i + this.cols] ?? -Infinity;
    const h11 = this.heights[i + this.cols + 1] ?? -Infinity;
    if (!Number.isFinite(h00 + h10 + h01 + h11))
      return Math.max(h00, h10, h01, h11);
    const tx = fx - c;
    const tz = fz - r;
    return (
      (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz
    );
  }

  /** Whether (x, z) is land the player can stand on rather than sea or lagoon. */
  isDry(x: number, z: number): boolean {
    return this.height(x, z) > WATER_LEVEL + SHORE_MARGIN;
  }

  /** Where the ray first meets the terrain or the sea surface. */
  raycast(ray: Ray, out: Vec3): boolean {
    const { origin: o, direction: d } = ray;
    const surface = (t: number) =>
      Math.max(this.height(o.x + d.x * t, o.z + d.z * t), WATER_LEVEL);
    const above = (t: number) => o.y + d.y * t > surface(t);
    if (!above(0)) return false;
    let lo = 0;
    for (let hi = RAY_STEP; hi <= RAY_MAX; lo = hi, hi += RAY_STEP) {
      if (above(hi)) continue;
      for (let i = 0; i < 10; i++) {
        const mid = (lo + hi) / 2;
        if (above(mid)) lo = mid;
        else hi = mid;
      }
      out.set(o.x + d.x * hi, o.y + d.y * hi, o.z + d.z * hi);
      out.y = surface(hi);
      return true;
    }
    return false;
  }
}
