import { type AppBase, type Entity, Vec3 } from "playcanvas";
import type { Obstacle, Zone } from "../collision";
import type { Ground } from "../ground";
import { ITEMS } from "./catalog";
import { createMenu } from "./menu";
import { Placement } from "./placement";

export { screenToGround } from "./placement";

interface InventoryOptions {
  app: AppBase;
  camera: Entity;
  player: Entity;
  /** Player facing around Y in degrees, where 0 faces +Z. */
  getHeading: () => number;
  ground: Ground;
  /** Shared with the player controller; solid placed items are added to it. */
  obstacles: Obstacle[];
  noBuildZones: Zone[];
}

/**
 * Inventory menu plus item placement. Items are unlimited for now.
 * Picking an item starts a ghost in front of the player that taps move
 * and Place confirms; tapping a placed item opens its rotate/remove menu.
 * Keys: I toggles the menu, R rotates, Enter places, Delete removes the
 * selection, Cmd/Ctrl+Z undoes, Esc cancels or closes.
 */
export function createInventory(opts: InventoryOptions) {
  const placement = new Placement(
    opts.app,
    opts.camera,
    opts.player,
    opts.getHeading,
    opts.ground,
    opts.obstacles,
    opts.noBuildZones,
  );
  const menu = createMenu(ITEMS, {
    onSelect: (item) => placement.startDraft(item),
    onConfirm: () => placement.confirmDraft(),
    onCancel: () => placement.cancelDraft(),
    onRotate: () => placement.rotate(),
    onRemove: () => placement.removeSelected(),
    onUndo: () => placement.undo(),
  });
  placement.onChange = () => {
    menu.setCanUndo(placement.canUndo);
    const { draft, selected } = placement;
    menu.setActions(
      draft
        ? {
            kind: "draft",
            reason: draft.result.ok ? null : draft.result.reason,
          }
        : selected
          ? { kind: "selected" }
          : null,
    );
  };

  // Keep the action menu pinned above the selected item as the camera moves.
  const anchor = new Vec3();
  const screen = new Vec3();
  const onPostRender = () => {
    const cam = opts.camera.camera;
    if (!cam || !placement.anchor(anchor)) {
      menu.placeActions(null);
      return;
    }
    cam.worldToScreen(anchor, screen);
    menu.placeActions(screen);
  };
  // After CameraFollow's postUpdate has moved the camera for this frame.
  opts.app.on("postrender", onPostRender);

  const onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      e.preventDefault();
      placement.undo();
      return;
    }
    if (e.repeat) return;
    if (key === "i") menu.toggle();
    else if (key === "r") placement.rotate();
    else if (key === "enter") placement.confirmDraft();
    else if (key === "delete" || key === "backspace")
      placement.removeSelected();
    else if (key === "escape") {
      if (menu.open) menu.close();
      else if (placement.draft) placement.cancelDraft();
      else placement.select(null);
    }
  };
  window.addEventListener("keydown", onKeyDown);

  return {
    /**
     * Returns true when the tap was used here, so the caller shouldn't also
     * walk there. While drafting, taps move the ghost; otherwise tapping a
     * placed item selects it and any other tap clears the selection.
     */
    pointerDown: (x: number, y: number) => {
      menu.close();
      if (placement.draft) {
        placement.moveDraft(x, y);
        return true;
      }
      const hit = placement.pick(x, y);
      placement.select(hit);
      return hit !== null;
    },
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      opts.app.off("postrender", onPostRender);
      menu.destroy();
      placement.destroy();
    },
  };
}
