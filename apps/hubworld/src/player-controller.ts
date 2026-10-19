import { type Entity, math, Script, type Vec3 } from "playcanvas";
import { ISLAND_RADIUS, type Obstacle } from "./landscape";

/** Walks the entity across the XZ plane toward a target, sliding around obstacles. */
export class PlayerController extends Script {
  static scriptName = "playerController";

  speed = 6;
  radius = 0.5;
  obstacles: Obstacle[] = [];
  /** Child mesh that bobs while walking; the root stays on the ground for the camera. */
  body: Entity | null = null;

  private target: Vec3 | null = null;
  private yaw = 0;
  private walkTime = 0;
  private lastDist = Infinity;
  private stallTime = 0;

  /** Facing around the Y axis, in degrees. */
  get heading() {
    return this.yaw;
  }

  setTarget(point: Vec3) {
    const target = point.clone();
    target.y = 0;
    // Pull targets inside an obstacle (or off the island) back to its edge.
    for (const o of this.obstacles) {
      const dx = target.x - o.x;
      const dz = target.z - o.z;
      const dist = Math.hypot(dx, dz);
      const min = o.radius + this.radius;
      if (dist < min && dist > 1e-4) {
        target.x = o.x + (dx / dist) * min;
        target.z = o.z + (dz / dist) * min;
      }
    }
    const edge = ISLAND_RADIUS - 1;
    const fromCentre = Math.hypot(target.x, target.z);
    if (fromCentre > edge) target.mulScalar(edge / fromCentre);
    this.target = target;
    this.lastDist = Infinity;
    this.stallTime = 0;
  }

  update(dt: number) {
    const pos = this.entity.getPosition().clone();
    let moving = false;

    if (this.target) {
      const dx = this.target.x - pos.x;
      const dz = this.target.z - pos.z;
      const dist = Math.hypot(dx, dz);
      const step = this.speed * dt;
      if (dist <= step) {
        pos.x = this.target.x;
        pos.z = this.target.z;
        this.target = null;
      } else {
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
        const targetYaw = (Math.atan2(dx, dz) * 180) / Math.PI;
        this.yaw = math.lerpAngle(this.yaw, targetYaw, Math.min(1, dt * 12));
        moving = true;
      }
      this.resolveCollisions(pos);
      this.checkStall(pos, dt);
    }

    this.walkTime = moving ? this.walkTime + dt : 0;
    const bob = moving ? Math.abs(Math.sin(this.walkTime * 12)) * 0.12 : 0;
    this.entity.setPosition(pos.x, 0, pos.z);
    this.entity.setEulerAngles(0, this.yaw, 0);
    this.body?.setLocalPosition(0, 1 + bob, 0);
  }

  // Give up when an obstacle blocks the way instead of walking into it forever.
  private checkStall(pos: Vec3, dt: number) {
    if (!this.target) return;
    const dist = Math.hypot(this.target.x - pos.x, this.target.z - pos.z);
    this.stallTime =
      dist < this.lastDist - this.speed * dt * 0.2 ? 0 : this.stallTime + dt;
    this.lastDist = dist;
    if (this.stallTime > 0.25) this.target = null;
  }

  private resolveCollisions(pos: Vec3) {
    for (const o of this.obstacles) {
      const dx = pos.x - o.x;
      const dz = pos.z - o.z;
      const dist = Math.hypot(dx, dz);
      const min = o.radius + this.radius;
      if (dist < min && dist > 1e-4) {
        pos.x = o.x + (dx / dist) * min;
        pos.z = o.z + (dz / dist) * min;
      }
    }
  }
}
