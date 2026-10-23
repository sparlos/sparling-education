import { type Entity, math, Script, type Vec3 } from "playcanvas";
import { type Obstacle, pushOut } from "./collision";
import type { Ground } from "./ground";

/** Walks the entity over the terrain toward a target, sliding around obstacles and the shoreline. */
export class PlayerController extends Script {
  static scriptName = "playerController";

  speed = 6;
  radius = 0.5;
  obstacles: Obstacle[] = [];
  ground: Ground | null = null;
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
    // Pull targets inside an obstacle back to its edge.
    for (const o of this.obstacles) pushOut(o, target, this.radius);
    this.target = target;
    this.lastDist = Infinity;
    this.stallTime = 0;
  }

  update(dt: number) {
    const pos = this.entity.getPosition().clone();
    let moving = false;

    if (this.target) {
      const fromX = pos.x;
      const fromZ = pos.z;
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
      for (const o of this.obstacles) pushOut(o, pos, this.radius);
      this.keepOnLand(pos, fromX, fromZ);
      this.checkStall(pos, dt);
    }

    this.walkTime = moving ? this.walkTime + dt : 0;
    const bob = moving ? Math.abs(Math.sin(this.walkTime * 12)) * 0.12 : 0;
    const y = this.ground?.height(pos.x, pos.z) ?? 0;
    this.entity.setPosition(pos.x, Number.isFinite(y) ? y : 0, pos.z);
    this.entity.setEulerAngles(0, this.yaw, 0);
    this.body?.setLocalPosition(0, 1 + bob, 0);
  }

  // The sea is an invisible wall: slide along the shore, or stay put.
  private keepOnLand(pos: Vec3, fromX: number, fromZ: number) {
    const ground = this.ground;
    if (!ground || ground.isDry(pos.x, pos.z)) return;
    if (ground.isDry(pos.x, fromZ)) pos.z = fromZ;
    else if (ground.isDry(fromX, pos.z)) pos.x = fromX;
    else {
      pos.x = fromX;
      pos.z = fromZ;
    }
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
}
