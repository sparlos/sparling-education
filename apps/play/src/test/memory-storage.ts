import type { KeyValueStore } from "../play/storage.ts";

/** An in-memory KeyValueStore, standing in for localStorage in tests. */
export function memoryStorage(): KeyValueStore & {
  readonly items: Map<string, string>;
} {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
    keys: () => [...items.keys()],
  };
}
