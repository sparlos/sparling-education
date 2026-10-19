import { type Entity, Script, Vec3 } from "playcanvas";

/**
 * Animal Crossing style camera: fixed high angle behind the target that
 * never rotates, smoothly trailing the target's position.
 */
export class CameraFollow extends Script {
  static scriptName = "cameraFollow";

  target: Entity | null = null;
  offset = new Vec3(0, 11, 13);
  /** Point above the target's feet the camera looks at. */
  lookHeight = 1;
  smoothing = 6;

  private focus = new Vec3();
  private desired = new Vec3();

  initialize() {
    if (!this.target) return;
    this.focus.copy(this.target.getPosition());
    this.place(1);
  }

  postUpdate(dt: number) {
    if (!this.target) return;
    this.place(1 - Math.exp(-this.smoothing * dt));
  }

  private place(t: number) {
    if (!this.target) return;
    this.focus.lerp(this.focus, this.target.getPosition(), t);
    this.desired.add2(this.focus, this.offset);
    this.entity.setPosition(this.desired);
    this.entity.lookAt(
      this.focus.x,
      this.focus.y + this.lookHeight,
      this.focus.z,
    );
  }
}
