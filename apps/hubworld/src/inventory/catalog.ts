import { Entity } from "playcanvas";
import { material, shape } from "../landscape";

/** Something the player can place in the world. */
export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  /** Radius on the ground that other placed things must stay clear of. */
  footprint: number;
  /** Collision radius for walking, or null if the player walks through it. */
  solidRadius: number | null;
  /** Builds the item's meshes under a root at the origin. */
  build(): Entity;
}

const mats = {
  trunk: material("#8a5a3b"),
  leaf: material("#3fa34d"),
  pine: material("#2f7d4a"),
  rock: material("#9aa3a8"),
  fence: material("#f3e3c3"),
  pink: material("#ff8fb1"),
  yellow: material("#ffd84d"),
};

const root = (name: string) => new Entity(name);

const flowers = (id: string, name: string, petals = mats.pink): ItemDef => ({
  id,
  name,
  icon: "🌸",
  footprint: 0.4,
  solidRadius: null,
  build() {
    const r = root(id);
    for (const [x, z] of [
      [-0.2, -0.15],
      [0.25, -0.05],
      [0, 0.25],
    ] as const) {
      shape(r, {
        type: "sphere",
        material: petals,
        position: [x, 0.15, z],
        scale: [0.25, 0.25, 0.25],
        shadows: false,
      });
    }
    return r;
  },
});

// Shapes mirror the scattered props in landscape.ts at scale 1.
export const ITEMS: ItemDef[] = [
  {
    id: "tree",
    name: "Tree",
    icon: "🌳",
    footprint: 1.1,
    solidRadius: 0.5,
    build() {
      const r = root("tree");
      shape(r, {
        type: "cylinder",
        material: mats.trunk,
        position: [0, 0.8, 0],
        scale: [0.4, 1.6, 0.4],
      });
      shape(r, {
        type: "sphere",
        material: mats.leaf,
        position: [0, 2.4, 0],
        scale: [2.2, 2, 2.2],
      });
      return r;
    },
  },
  {
    id: "pine",
    name: "Pine",
    icon: "🌲",
    footprint: 1,
    solidRadius: 0.5,
    build() {
      const r = root("pine");
      shape(r, {
        type: "cylinder",
        material: mats.trunk,
        position: [0, 0.5, 0],
        scale: [0.35, 1, 0.35],
      });
      shape(r, {
        type: "cone",
        material: mats.pine,
        position: [0, 1.8, 0],
        scale: [2, 2, 2],
      });
      shape(r, {
        type: "cone",
        material: mats.pine,
        position: [0, 2.8, 0],
        scale: [1.4, 1.6, 1.4],
      });
      return r;
    },
  },
  {
    id: "rock",
    name: "Rock",
    icon: "🪨",
    footprint: 0.6,
    solidRadius: 0.5,
    build() {
      const r = root("rock");
      shape(r, {
        type: "sphere",
        material: mats.rock,
        position: [0, 0.2, 0],
        scale: [1.2, 0.8, 1],
      });
      return r;
    },
  },
  {
    id: "fence",
    name: "Fence",
    icon: "🚧",
    // Half the post spacing, so segments chain end to end on the grid.
    footprint: 0.7,
    solidRadius: 0.7,
    build() {
      const r = root("fence");
      for (const x of [-0.7, 0.7]) {
        shape(r, {
          type: "box",
          material: mats.fence,
          position: [x, 0.5, 0],
          scale: [0.2, 1, 0.2],
        });
      }
      shape(r, {
        type: "box",
        material: mats.fence,
        position: [0, 0.75, 0],
        scale: [1.6, 0.15, 0.1],
      });
      return r;
    },
  },
  flowers("flowers-pink", "Pink flowers"),
  { ...flowers("flowers-yellow", "Yellow flowers", mats.yellow), icon: "🌼" },
];
