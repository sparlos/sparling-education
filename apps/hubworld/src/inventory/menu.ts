import type { ItemDef } from "./catalog";

const CSS = `
.inv-bag, .inv-panel, .inv-top, .inv-actions { font: 600 14px/1.2 system-ui, sans-serif; color: #3b2f2a; }
.inv-bag {
  position: fixed; right: 16px; bottom: 16px; width: 56px; height: 56px;
  border: 0; border-radius: 50%; background: #fff8ec; font-size: 26px;
  box-shadow: 0 4px 0 #d9c3a0; cursor: pointer;
}
.inv-panel {
  position: fixed; left: 50%; bottom: 84px; transform: translateX(-50%);
  width: min(440px, calc(100vw - 32px)); box-sizing: border-box; padding: 12px;
  border-radius: 18px; background: #fff8ec; box-shadow: 0 6px 0 #d9c3a0;
}
.inv-panel[hidden], .inv-top[hidden], .inv-actions[hidden], .inv-top > [hidden], .inv-actions [hidden] { display: none; }
.inv-title { margin: 0 4px 10px; font-size: 16px; }
.inv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 8px; }
.inv-item {
  display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 4px;
  border: 2px solid transparent; border-radius: 12px; background: #f3e6cf;
  font: inherit; color: inherit; cursor: pointer;
}
.inv-item:hover { border-color: #e0b878; }
.inv-icon { font-size: 28px; }
.inv-top {
  position: fixed; left: 50%; top: 16px; transform: translateX(-50%);
  display: flex; align-items: center; gap: 8px; max-width: calc(100vw - 32px);
  padding: 6px; border-radius: 999px;
  background: rgba(255, 248, 236, 0.95); box-shadow: 0 3px 0 #d9c3a0;
}
/* Anchored above the selected item; positioned each frame from its screen point. */
.inv-actions {
  position: fixed; left: 0; top: 0; transform: translate(-50%, calc(-100% - 8px));
  display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 6px;
  border-radius: 16px; background: #fff8ec; box-shadow: 0 4px 0 #d9c3a0;
}
.inv-reason { padding: 2px 8px 0; color: #c0392b; }
.inv-row { display: flex; gap: 6px; }
.inv-actions .inv-confirm { background: #6be38a; }
.inv-actions .inv-confirm:hover { background: #55d176; }
.inv-actions button:disabled { opacity: 0.45; cursor: not-allowed; }
.inv-actions::after {
  content: ""; position: absolute; left: 50%; bottom: -7px; transform: translateX(-50%) rotate(45deg);
  width: 12px; height: 12px; background: #fff8ec;
}
.inv-top button, .inv-actions button {
  border: 0; border-radius: 999px; padding: 8px 14px; background: #f3e6cf;
  font: inherit; color: inherit; cursor: pointer;
}
.inv-top button:hover, .inv-actions button:hover { background: #ecd8b5; }
`;

export interface MenuHandlers {
  onSelect(item: ItemDef): void;
  onConfirm(): void;
  onCancel(): void;
  onRotate(): void;
  onRemove(): void;
  onUndo(): void;
}

/** What the floating menu is acting on: a ghost being positioned, or a placed item. */
export type ActionsMode =
  | { kind: "draft"; reason: string | null }
  | { kind: "selected" }
  | null;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text = "",
) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function button(text: string, onClick: () => void) {
  const b = el("button", "", text);
  b.addEventListener("click", onClick);
  return b;
}

/**
 * Plain-DOM HUD: a bag button with the item panel, a top bar for undo,
 * and the action menu over the ghost or selected item.
 */
export function createMenu(items: ItemDef[], handlers: MenuHandlers) {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  const bag = el("button", "inv-bag", "🎒");
  bag.title = "Inventory (I)";
  bag.setAttribute("aria-label", "Inventory");

  const panel = el("div", "inv-panel");
  panel.hidden = true;
  const grid = el("div", "inv-grid");
  panel.append(el("h2", "inv-title", "Inventory"), grid);
  for (const item of items) {
    const card = el("button", "inv-item");
    card.append(el("span", "inv-icon", item.icon), el("span", "", item.name));
    card.addEventListener("click", () => {
      panel.hidden = true;
      handlers.onSelect(item);
    });
    grid.append(card);
  }
  bag.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
  });

  const top = el("div", "inv-top");
  top.hidden = true;
  top.append(button("↶ Undo", () => handlers.onUndo()));

  const actions = el("div", "inv-actions");
  actions.hidden = true;
  const reason = el("span", "inv-reason");
  const confirm = button("✓ Place", () => handlers.onConfirm());
  confirm.classList.add("inv-confirm");
  const cancel = button("✕ Cancel", () => handlers.onCancel());
  const remove = button("🗑️ Remove", () => handlers.onRemove());
  const row = el("div", "inv-row");
  row.append(
    confirm,
    button("↻ Rotate", () => handlers.onRotate()),
    cancel,
    remove,
  );
  actions.append(reason, row);

  document.body.append(bag, panel, top, actions);

  return {
    get open() {
      return !panel.hidden;
    },
    toggle() {
      panel.hidden = !panel.hidden;
    },
    close() {
      panel.hidden = true;
    },
    setCanUndo(canUndo: boolean) {
      top.hidden = !canUndo;
    },
    setActions(mode: ActionsMode) {
      const draft = mode?.kind === "draft";
      confirm.hidden = !draft;
      cancel.hidden = !draft;
      remove.hidden = draft;
      confirm.disabled = draft && mode.reason !== null;
      reason.textContent = draft ? (mode.reason ?? "") : "";
      reason.hidden = !reason.textContent;
      if (!mode) actions.hidden = true;
    },
    /** Pins the action menu's tail to a screen point, or hides it. */
    placeActions(point: { x: number; y: number } | null) {
      actions.hidden = !point;
      if (point) actions.style.translate = `${point.x}px ${point.y}px`;
    },
    destroy() {
      style.remove();
      bag.remove();
      panel.remove();
      top.remove();
      actions.remove();
    },
  };
}
