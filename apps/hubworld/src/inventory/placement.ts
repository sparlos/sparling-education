import {
  type AppBase,
  BLEND_NORMAL,
  Color,
  Entity,
  Plane,
  Ray,
  type RenderComponent,
  StandardMaterial,
  Vec3,
} from "playcanvas";
import { ISLAND_RADIUS, type Obstacle, type Zone } from "../landscape";
import type { ItemDef } from "./catalog";
import {
  checkPlacement,
  type PlacementResult,
  type PlacementWorld,
} from "./placement-rules";

const GRID = 0.5;
const ROTATE_STEP = 45;
const PLAYER_RADIUS = 0.5;
/** Gap left between the player and a draft spawned in front of them. */
const DROP_GAP = 0.25;
/** Fallback spots tried when straight ahead is blocked: extra distance, then angle off heading. */
const DROP_DISTANCES = [0, 0.5, 1, 1.5];
const DROP_ANGLES = [0, 30, -30, 60, -60];

export interface PlacedItem {
  def: ItemDef;
  entity: Entity;
  yaw: number;
  /** Height of the model's top, for anchoring UI above it. */
  height: number;
  footprint: Obstacle;
  obstacle: Obstacle | null;
}

/** An item being positioned: shown as a ghost until confirmed. */
interface Draft {
  def: ItemDef;
  entity: Entity;
  x: number;
  z: number;
  yaw: number;
  height: number;
  result: PlacementResult;
  /** Ghost material currently applied, so it's only swapped on change. */
  mat: StandardMaterial | null;
}

/** Removed items stay alive (detached) in history so undo restores the same object. */
type Action =
  | { kind: "place"; item: PlacedItem }
  | { kind: "remove"; item: PlacedItem }
  | { kind: "rotate"; item: PlacedItem; from: number };

const ground = new Plane(Vec3.UP, 0);
const ray = new Ray();
const rayHit = new Vec3();

/** Builds the camera ray through a screen point. */
function screenRay(camera: Entity, x: number, y: number, out: Ray): boolean {
  const cam = camera.camera;
  if (!cam) return false;
  cam.screenToWorld(x, y, cam.nearClip, out.origin);
  cam.screenToWorld(x, y, cam.farClip, out.direction);
  out.direction.sub(out.origin).normalize();
  return true;
}

/** Projects a screen point onto the ground plane. */
export function screenToGround(
  camera: Entity,
  x: number,
  y: number,
  out: Vec3,
): boolean {
  return screenRay(camera, x, y, ray) && ground.intersectsRay(ray, out);
}

function overlayMaterial(hex: string, opacity: number) {
  const mat = new StandardMaterial();
  mat.diffuse = new Color().fromString(hex);
  mat.emissive = new Color().fromString(hex).mulScalar(0.4);
  mat.opacity = opacity;
  mat.blendType = BLEND_NORMAL;
  mat.depthWrite = false;
  mat.update();
  return mat;
}

const renders = (entity: Entity) =>
  entity.findComponents("render") as RenderComponent[];

function setMaterial(entity: Entity, mat: StandardMaterial) {
  for (const render of renders(entity)) {
    render.material = mat;
    render.castShadows = false;
  }
}

function topOf(entity: Entity) {
  let height = 0;
  for (const render of renders(entity))
    for (const mi of render.meshInstances)
      height = Math.max(height, mi.aabb.getMax().y);
  return height;
}

const snap = (v: number) => Math.round(v / GRID) * GRID;
const wrap = (deg: number) => ((deg % 360) + 360) % 360;

/**
 * Picking an item starts a ghost draft in front of the player; taps move
 * it and it only becomes real once confirmed. Placed items can be tapped
 * to select, then rotated or removed. Local-only for now; nothing is
 * persisted or synced.
 */
export class Placement {
  /** Fired when the draft, selection, validity or undo history changes. */
  onChange: () => void = () => {};

  private placedRoot: Entity;
  private ring: Entity;
  private placed: PlacedItem[] = [];
  private history: Action[] = [];
  private draftItem: Draft | null = null;
  private selectedItem: PlacedItem | null = null;
  private time = 0;
  private valid = overlayMaterial("#6be38a", 0.55);
  private invalid = overlayMaterial("#ff6b6b", 0.55);
  private highlight = overlayMaterial("#fff3b0", 0.5);
  private point = new Vec3();

  constructor(
    private app: AppBase,
    private camera: Entity,
    private player: Entity,
    /** Player facing around Y in degrees, where 0 faces +Z. */
    private getHeading: () => number,
    private obstacles: Obstacle[],
    private noBuildZones: Zone[],
  ) {
    this.placedRoot = new Entity("placed-items");
    app.root.addChild(this.placedRoot);
    this.ring = new Entity("placement-ring");
    this.ring.addComponent("render", {
      type: "cylinder",
      material: this.highlight,
      castShadows: false,
    });
    this.ring.enabled = false;
    app.root.addChild(this.ring);
    app.on("update", this.update);
  }

  get draft(): Readonly<Draft> | null {
    return this.draftItem;
  }

  get selected() {
    return this.selectedItem;
  }

  get canUndo() {
    return this.history.length > 0;
  }

  /**
   * Starts a ghost of the item on the nearest free spot in front of the
   * player, or straight ahead (shown invalid) if nowhere nearby is free.
   */
  startDraft(def: ItemDef) {
    this.cancelDraft();
    this.select(null);
    const pos = this.player.getPosition();
    const heading = this.getHeading();
    const reach = PLAYER_RADIUS + def.footprint + DROP_GAP;
    const spot = (extra: number, offset: number) => {
      const a = ((heading + offset) * Math.PI) / 180;
      return {
        x: snap(pos.x + Math.sin(a) * (reach + extra)),
        z: snap(pos.z + Math.cos(a) * (reach + extra)),
      };
    };
    const world = this.world();
    const candidates = DROP_DISTANCES.flatMap((extra) =>
      DROP_ANGLES.map((offset) => spot(extra, offset)),
    );
    const { x, z } =
      candidates.find(
        (c) => checkPlacement(c.x, c.z, def.footprint, world).ok,
      ) ?? spot(0, 0);

    const entity = def.build();
    this.app.root.addChild(entity);
    this.draftItem = {
      def,
      entity,
      x,
      z,
      // Face the item the way the player faces, on the rotation steps.
      yaw: wrap(Math.round(heading / ROTATE_STEP) * ROTATE_STEP),
      height: topOf(entity),
      result: { ok: true },
      mat: null,
    };
    this.evaluateDraft(true);
  }

  /** Moves the draft to the ground under a screen point. */
  moveDraft(screenX: number, screenY: number) {
    const draft = this.draftItem;
    if (!draft || !screenToGround(this.camera, screenX, screenY, this.point))
      return;
    draft.x = snap(this.point.x);
    draft.z = snap(this.point.z);
    this.evaluateDraft();
  }

  /** Turns the draft into a real item if its spot is valid. */
  confirmDraft() {
    const draft = this.draftItem;
    if (!draft?.result.ok) return;
    this.cancelDraft();
    const item = this.create(draft.def, draft.x, draft.z, draft.yaw);
    this.history.push({ kind: "place", item });
    this.onChange();
  }

  cancelDraft() {
    if (!this.draftItem) return;
    this.draftItem.entity.destroy();
    this.draftItem = null;
    this.ring.enabled = false;
    this.onChange();
  }

  /** Rotates the draft if there is one, otherwise the selected item. */
  rotate() {
    if (this.draftItem) {
      this.draftItem.yaw = wrap(this.draftItem.yaw + ROTATE_STEP);
      this.evaluateDraft();
      return;
    }
    const item = this.selectedItem;
    if (!item) return;
    this.history.push({ kind: "rotate", item, from: item.yaw });
    this.setYaw(item, item.yaw + ROTATE_STEP);
    this.onChange();
  }

  /** The placed item whose meshes are under the screen point, nearest the camera. */
  pick(x: number, y: number): PlacedItem | null {
    if (!screenRay(this.camera, x, y, ray)) return null;
    let best: PlacedItem | null = null;
    let bestDist = Infinity;
    for (const item of this.placed) {
      for (const render of renders(item.entity)) {
        for (const mi of render.meshInstances) {
          if (!mi.aabb.intersectsRay(ray, rayHit)) continue;
          const dist = rayHit.distance(ray.origin);
          if (dist < bestDist) {
            best = item;
            bestDist = dist;
          }
        }
      }
    }
    return best;
  }

  select(item: PlacedItem | null) {
    if (item === this.selectedItem) return;
    this.selectedItem = item;
    if (item) {
      const { x, z, radius } = item.footprint;
      this.showRing(x, z, radius, this.highlight);
    } else if (!this.draftItem) this.ring.enabled = false;
    this.onChange();
  }

  removeSelected() {
    const item = this.selectedItem;
    if (!item) return;
    this.detach(item);
    this.history.push({ kind: "remove", item });
    this.onChange();
  }

  /** Reverts the last place, rotate or remove. */
  undo() {
    const action = this.history.pop();
    if (!action) return;
    if (action.kind === "place") {
      this.detach(action.item);
      action.item.entity.destroy();
    } else if (action.kind === "remove") {
      this.attach(action.item);
    } else {
      this.setYaw(action.item, action.from);
    }
    this.onChange();
  }

  /** World point just above the draft or selected item, for anchoring its menu. */
  anchor(out: Vec3): boolean {
    const target = this.draftItem
      ? { x: this.draftItem.x, z: this.draftItem.z, h: this.draftItem.height }
      : this.selectedItem
        ? {
            x: this.selectedItem.footprint.x,
            z: this.selectedItem.footprint.z,
            h: this.selectedItem.height,
          }
        : null;
    if (!target) return false;
    out.set(target.x, target.h + 0.3, target.z);
    return true;
  }

  destroy() {
    this.app.off("update", this.update);
    this.draftItem?.entity.destroy();
    this.ring.destroy();
    this.placedRoot.destroy();
    for (const item of this.placed) this.unblock(item);
    for (const action of this.history)
      if (action.kind === "remove") action.item.entity.destroy();
    this.placed = [];
    this.history = [];
  }

  private update = (dt: number) => {
    // The player can still be walking, so the draft's spot is re-checked.
    if (this.draftItem) this.evaluateDraft();
    else if (this.selectedItem) {
      // Gently pulse the selection ring so it reads as interactive.
      this.time += dt;
      const s =
        this.selectedItem.footprint.radius *
        2 *
        (1 + Math.sin(this.time * 5) * 0.06);
      this.ring.setLocalScale(s, 0.02, s);
    }
  };

  private evaluateDraft(force = false) {
    const draft = this.draftItem;
    if (!draft) return;
    const before = draft.result;
    draft.result = checkPlacement(
      draft.x,
      draft.z,
      draft.def.footprint,
      this.world(),
    );
    const mat = draft.result.ok ? this.valid : this.invalid;
    if (mat !== draft.mat) setMaterial(draft.entity, mat);
    draft.mat = mat;
    draft.entity.setPosition(draft.x, 0, draft.z);
    draft.entity.setEulerAngles(0, draft.yaw, 0);
    this.showRing(draft.x, draft.z, draft.def.footprint, mat);
    const reason = (r: PlacementResult) => (r.ok ? null : r.reason);
    if (force || reason(before) !== reason(draft.result)) this.onChange();
  }

  private showRing(x: number, z: number, r: number, mat: StandardMaterial) {
    this.ring.enabled = true;
    if (this.ring.render) this.ring.render.material = mat;
    this.ring.setPosition(x, 0.05, z);
    this.ring.setLocalScale(r * 2, 0.02, r * 2);
  }

  private world(): PlacementWorld {
    const pos = this.player.getPosition();
    return {
      islandRadius: ISLAND_RADIUS,
      edgeMargin: 1,
      noBuildZones: this.noBuildZones,
      obstacles: this.obstacles,
      placed: this.placed.map((p) => p.footprint),
      player: { x: pos.x, z: pos.z, radius: PLAYER_RADIUS },
    };
  }

  private create(def: ItemDef, x: number, z: number, yaw: number) {
    const entity = def.build();
    entity.setPosition(x, 0, z);
    const item: PlacedItem = {
      def,
      entity,
      yaw: 0,
      height: 0,
      footprint: { x, z, radius: def.footprint },
      obstacle:
        def.solidRadius === null ? null : { x, z, radius: def.solidRadius },
    };
    this.setYaw(item, yaw);
    this.attach(item);
    item.height = topOf(entity);
    return item;
  }

  private setYaw(item: PlacedItem, yaw: number) {
    item.yaw = wrap(yaw);
    item.entity.setEulerAngles(0, item.yaw, 0);
  }

  private attach(item: PlacedItem) {
    this.placedRoot.addChild(item.entity);
    if (item.obstacle) this.obstacles.push(item.obstacle);
    this.placed.push(item);
  }

  private detach(item: PlacedItem) {
    this.unblock(item);
    this.placedRoot.removeChild(item.entity);
    const i = this.placed.indexOf(item);
    if (i >= 0) this.placed.splice(i, 1);
    if (this.selectedItem === item) this.select(null);
  }

  private unblock(item: PlacedItem) {
    if (!item.obstacle) return;
    const i = this.obstacles.indexOf(item.obstacle);
    if (i >= 0) this.obstacles.splice(i, 1);
  }
}
