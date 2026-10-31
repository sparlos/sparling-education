/** The part of Web Storage the shell uses, so tests can supply their own. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  /** Every key currently stored. */
  keys(): string[];
}

/**
 * The browser's localStorage, or null when it's unavailable (blocked site
 * data, some private windows). Callers must work without it.
 */
export function browserStorage(): KeyValueStore | null {
  try {
    const storage = window.localStorage;
    const probe = "storage.probe";
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return {
      getItem: (key) => storage.getItem(key),
      setItem: (key, value) => storage.setItem(key, value),
      removeItem: (key) => storage.removeItem(key),
      keys: () => Object.keys(storage),
    };
  } catch {
    return null;
  }
}

/** Reads and parses a JSON value, or returns undefined if it's missing, unreadable or invalid. */
export function readJson(storage: KeyValueStore | null, key: string): unknown {
  try {
    const raw = storage?.getItem(key);
    return raw == null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Removes a key, ignoring storage that's unavailable. */
export function remove(storage: KeyValueStore | null, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Nothing to remove from storage we can't reach.
  }
}

/** Writes a JSON value, returning false if storage is unavailable or full. */
export function writeJson(
  storage: KeyValueStore | null,
  key: string,
  value: unknown,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
